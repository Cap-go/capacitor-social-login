import { SocialLogin } from '@capgo&#x2F;capacitor-social-login';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    SocialLogin.echo({ value: inputValue })
}
