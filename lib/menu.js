const fs = require('fs-extra')
const { 
    prefix
} = JSON.parse(fs.readFileSync('./settings/setting.json'))

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textTnC = () => {
    return `
Código-fonte / bot é um programa de código aberto (gratuito) escrito em Javascript, você pode usar, copiar, modificar, combinar, publicar, distribuir, sublicenciar e / ou vender cópias sem remover o autor principal do código-fonte / bot.

Ao usar este código-fonte / bot, você concorda com os seguintes Termos e Condições:
- O código-fonte / bot não armazena seus dados em nossos servidores.
- O código-fonte / bot não é responsável por seus pedidos para este bot.
- Você pode ver o código-fonte / bot em https://github.com/ArugaZ/whatsapp-bot`
}

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textMenu = (pushname) => {
    return `
Oi, ${pushname}! 👋️
Aqui estão alguns dos recursos deste bot! ✨

Criador:
- *${prefix}sticker*
- *${prefix}stickergif*
- *${prefix}stickergiphy*
- *${prefix}meme*
- *${prefix}nulis*

Download:
- *${prefix}ytmp3*
- *${prefix}ytmp4*
- *${prefix}facebook*

Busca Qualquer:
- *${prefix}images*
- *${prefix}sreddit*
- *${prefix}insta*
- *${prefix}ss*
- *${prefix}play*
- *${prefix}movie*
- *${prefix}qualanime*

Áudios:
- *${prefix}yamete*
- *${prefix}banido*
- *${prefix}hamerti*
- *${prefix}ojostristes*
- *${prefix}69*

Outros:
- *${prefix}tts*
- *${prefix}encurtarlink*
- *${prefix}gatinho*

Sobre Bot:
- *${prefix}status*
- *${prefix}entrar*

Espero que você tenha um ótimo dia!✨`
}

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textAdmin = () => {
    return `
⚠ [ *Admin Group Only* ] ⚠ 
Aqui estão os recursos de administração de grupo deste bot!

- *${prefix}add*
- *${prefix}kick* @tag
- *${prefix}promote* @tag
- *${prefix}demote* @tag
- *${prefix}mutegrup*
- *${prefix}tagall*
- *${prefix}setprofile*
- *${prefix}del*

_-_-_-_-_-_-_-_-_-_-_-_-_-_

⚠ [ *Owner Group Only* ] ⚠
Aqui estão os recursos do proprietário do grupo neste bot!
- *${prefix}kickall*
*O grupo proprietário é um criador do grupo.*
`
}

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textDonasi = () => {
    return ``
}
