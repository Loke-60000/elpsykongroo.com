import { access } from '~/assets/ts/access';
import { pkce } from '~/assets/ts/pkce';
import axios from "axios";
import { env } from "~/assets/ts/env";
// const attestation:AttestationConveyancePreference = "direct";
import * as webauthnJson from "@github/webauthn-json";
import { visible } from "~/assets/ts/visible";
import { ElMessage, ElNotification } from 'element-plus';
import { deleteCookie, handleCookie, getAccessToken } from './handleAuthCode';


const callbackUrl = window.location.href;
const redirect = new URL(callbackUrl).searchParams.get('redirect_uri');
const state = new URL(callbackUrl).searchParams.get('state');

const referrer = document.referrer;
var idp;

if (referrer != "" && referrer != undefined) {   
    idp = referrer.split(".")[0].split("//")[1];
    if (idp != "elpsykongroo" && document.domain != "localhost" && document.domain != "127.0.0.1") {
        visible.webauthnFormVisible = true
    }
}

if (redirect != null && state != null) {
    visible.webauthnFormVisible = true
}

const webauthnRegister = () => {
    if (access.username.length > 0) {
        visible.loading = true;
        const registerOption = {
            baseURL: env.authUrl,
            url: "/register",
            method: "POST",
            data: {
                username: access.username,
                display: access.username,
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                // "Access-Control-Allow-Origin": "*",
                // "Access-Control-Allow-Credentials": "true"
            },
            // withCredentials: true                        
        }
        axios(registerOption).then(async function (response) {
            const publicKeyCredential = await webauthnJson.create(response.data);
            const option = {
                baseURL: env.authUrl,
                url: "/finishauth",
                method: "POST",
                data: {
                    credname: access.username,
                    username: access.username,
                    credential: JSON.stringify(publicKeyCredential),
                },
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    // "Access-Control-Allow-Origin": "*",
                    // "Access-Control-Allow-Credentials": "true"
                }, 
                // withCredentials: true                        
            }
            axios(option).then(function (response) {
                visible.loading = false;
                if (response.data == 200) {
                    ElNotification({
                        title: 'Register success',
                        message: 'have fun with login',
                        duration: 5000,
                    })
                } else {
                  ElNotification({
                        title: 'Register failed',
                        message: 'this user already exist',
                        duration: 5000,
                  })
                }
            });
        });
    }
}

async function  webauthnLogin() {
    if (access.username.length > 0) {
        visible.loading = true;
        const loginOption = {
            baseURL: env.authUrl,
            url: "/login",
            method: "POST",
            data: {
                username: access.username,
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            withCredentials: true               
        }
        axios(loginOption).then(async function (response) {
            if(response.data == 200) {
                if(handleCookie().length == 0) {
                    refreshlogin();
                } else {
                    getAccessToken();
                    visible.loading = false;
                    visible.webauthnFormVisible = false;
                }
            } else {
                const publicKeyCredential = await webauthnJson.get(response.data);
                const indexOption = {
                    baseURL: env.authUrl,
                    url: "/welcome",
                    method: "POST",
                    data: {
                        username: access.username,
                        credential: JSON.stringify(publicKeyCredential),
                    },
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },   
                    withCredentials: true      
                }
                axios(indexOption).then(function (response) {
                    if(response.data == 200) {
                        visible.loading = false;
                        visible.webauthnFormVisible = false
                        console.log(idp)
                        if (idp == undefined || idp == "elpsykongroo") {
                            if (document.domain != "localhost") {
                                window.location.href = "https://oauth2-proxy.elpsykongroo.com/oauth2/start?rd=https://elpsykongroo.com";
                            } else {
                                pkce();
                            }                          
                        } else if (redirect != null && state != null) {
                            window.location.href = env.authUrl + "/oauth2/authorize" + window.location.search;
                        } else if (idp != "") {
                            window.location.href=env.authUrl+"/oauth2/authorization/" + idp;
                        } 
                    }
                });
            }
        })
    }
}

const refreshlogin = () => {
    if (document.domain != "localhost") {
        window.location.href = "https://oauth2-proxy.elpsykongroo.com/oauth2/start?rd=https://elpsykongroo.com";
    } else {
        pkce();
    }
}


const logout = () => {
    ElMessage('you will logout in 3s');
    revoke();
    const option = {
      baseURL: env.authUrl,
      url: "/logout",
      method: "POST",
      headers: {
        'Authorization': 'Bearer '+ access.access_token
      },
    }
    axios(option).then(function (response) {
        access.grant_type = "";
        access.expires_in = 5;
        access.access_token = "";
        access.refresh_token = "";
        deleteCookie("_oauth2_proxy");
    })
  }

  const revoke = () => {
    const option = {
        baseURL: env.authUrl,
        url: "/oauth2/revoke",
        method: "POST",
        data: {
          token: access.access_token,
          token_type_hint: "access_token",
          client_id: "pkce"
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }, 
        withCredentials: true                
        // auth : { 
        //     username : "pkce", 
        //     password : "" 
        // } ,
        
      }
      axios(option).then(function (response) {
        console.log(response.data);
      })   
  }


export { webauthnLogin, webauthnRegister, refreshlogin, logout }