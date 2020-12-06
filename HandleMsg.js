require('dotenv').config()
const { decryptMedia } = require('@open-wa/wa-automate')

const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const axios = require('axios')
const fetch = require('node-fetch')

const appRoot = require('app-root-path')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db_group = new FileSync(appRoot+'/lib/data/group.json')
const db = low(db_group)
db.defaults({ group: []}).write()

const { 
    removeBackgroundFromImageBase64
} = require('remove.bg')

const {
    exec
} = require('child_process')

const { 
    menuId, 
    cekResi, 
    urlShortener, 
    meme, 
    translate, 
    getLocationData,
    images,
    receita,
    rugapoi,
    rugaapi,
    cariKasar
} = require('./lib')

const { 
    msgFilter, 
    color, 
    processTime, 
    isUrl,
	download
} = require('./utils')

const { uploadImages } = require('./utils/fetcher')

const fs = require('fs-extra')
const banned = JSON.parse(fs.readFileSync('./settings/banned.json'))
const simi = JSON.parse(fs.readFileSync('./settings/simi.json'))
const ngegas = JSON.parse(fs.readFileSync('./settings/ngegas.json'))
const setting = JSON.parse(fs.readFileSync('./settings/setting.json'))
const welcome = JSON.parse(fs.readFileSync('./settings/welcome.json'))

let { 
    ownerNumber, 
    groupLimit, 
    memberLimit,
    prefix
} = setting

const {
    apiNoBg,
	apiSimi
} = JSON.parse(fs.readFileSync('./settings/api.json'))

function formatin(duit){
    let	reverse = duit.toString().split('').reverse().join('');
    let ribuan = reverse.match(/\d{1,3}/g);
    ribuan = ribuan.join('.').split('').reverse().join('');
    return ribuan;
}

const inArray = (needle, haystack) => {
    let length = haystack.length;
    for(let i = 0; i < length; i++) {
        if(haystack[i].id == needle) return i;
    }
    return false;
}

module.exports = HandleMsg = async (client, message) => {
    try {
        const { type, id, from, t, sender, author, isGroupMsg, chat, chatId, caption, isMedia, mimetype, quotedMsg, quotedMsgObj, mentionedJidList } = message
        let { body } = message
        var { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
        const botNumber = await client.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await client.getGroupAdmins(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
		const chats = (type === 'chat') ? body : (type === 'image' || type === 'video') ? caption : ''
		const pengirim = sender.id
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

        // Bot Prefix
        body = (type === 'chat' && body.startsWith(prefix)) ? body : ((type === 'image' && caption || type === 'video' && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.trim().substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
		const argx = chats.slice(0).trim().split(/ +/).shift().toLowerCase()
        const isCmd = body.startsWith(prefix)
        const uaOverride = process.env.UserAgent
        const url = args.length !== 0 ? args[0] : ''
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
	    const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'
		
		// [IDENTIFY]
		const isOwnerBot = ownerNumber.includes(pengirim)
        const isBanned = banned.includes(pengirim)
		const isSimi = simi.includes(chatId)
		const isNgegas = ngegas.includes(chatId)
		const isKasar = await cariKasar(chats)

        // [BETA] Avoid Spam Message
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        //
        if(!isCmd && isKasar && isGroupMsg) { console.log(color('[BADW]', 'orange'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${argx}`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }

        // [BETA] Avoid Spam Message
        msgFilter.addFilter(from)
	
	//[AUTO READ] Auto read message 
	client.sendSeen(chatId)
	    
	// Filter Banned People
        if (isBanned) {
            return console.log(color('[BAN]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }
		
        switch (command) {
        // Menu and TnC
        case 'speed':
        case 'ping':
            await client.sendText(from, `Pong!!!!\nTempo de resposta: ${processTime(t, moment())} _Second_`)
            break

        /*
        case 'tnc':
            await client.sendText(from, menuId.textTnC())
            break
        case 'notes':
        case 'menu':
        case 'help':
            await client.sendText(from, menuId.textMenu(pushname))
            .then(() => ((isGroupMsg) && (isGroupAdmins)) ? client.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
            break
        */

        case 'menuadmin':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            await client.sendText(from, menuId.textAdmin())
            break

            /*
        case 'donate':
        case 'doar':
            await client.sendText(from, menuId.textDonasi())
            break
            */

           /*
        case 'ownerbot':
            await client.sendContact(from, ownerNumber)
            .then(() => client.sendText(from, 'Se você quiser solicitar um recurso, converse com o número do proprietário!'))
            break
            */

        case 'entrar':
        case 'join':
            if (args.length == 0) return client.reply(from, `Se você quiser convidar o bot para o grupo, convide ou usando ${prefix}entrar [link do grupo]`, id)
            let linkgrup = body.slice(6)
            let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
            let chekgrup = await client.inviteInfo(linkgrup)
            if (!islink) return client.reply(from, 'Desculpe, o link do grupo está errado! por favor nos envie o link correto', id)
            if (isOwnerBot) {
                await client.joinGroupViaLink(linkgrup)
                      .then(async () => {
                          await client.sendText(from, 'Entrou no grupo com sucesso através do link!')
                          await client.sendText(chekgrup.id, `Para descobrir os comandos desse bot ${prefix}menu`)
                      })
            } else {
                let cgrup = await client.getAllGroups()
                if (cgrup.length > groupLimit) return client.reply(from, `Desculpe, bot está cheio de grupos \nO máximo é: ${groupLimit}`, id)
                if (cgrup.size < memberLimit) return client.reply(from, `Desculpe, BOT não entrará se os membros do grupo não excederem ${memberLimit} pessoas`, id)
                await client.joinGroupViaLink(linkgrup)
                      .then(async () =>{
                          await client.reply(from, 'Entrou no grupo com sucesso através do link!', id)
                      })
                      .catch(() => {
                          client.reply(from, 'Falhou!', id)
                      })
            }
            break

        case 'status': {
            const loadedMsg = await client.getAmountOfLoadedMessages()
            const chatIds = await client.getAllChatIds()
            const groups = await client.getAllGroups()
            client.sendText(from, `Status :\n- *${loadedMsg}* Mensagens carregadas\n- *${groups.length}* Grupos:\n- *${chatIds.length - groups.length}* Conversar em privado:\n- *${chatIds.length}* Conversas totais`)
            break
        }

        // Sticker Creator
	case 'coolteks':
	case 'cooltext':
            if (args.length == 0) return aruga.reply(from, `Para fazer CoolText texto legal em imagens, use ${prefix}cooltext texto\n\nExemplo: ${prefix}cooltext texto de exemplo`, id)
		rugaapi.cooltext(args[0])
		.then(async(res) => {
		await aruga.sendFileFromUrl(from, `${res.link}`, '', `${res.text}`, id)
		})
    break
        
        case 'sticker':
        case 'stiker':
            if ((isMedia || isQuotedImage) && args.length === 0) {
                const encryptMedia = isQuotedImage ? quotedMsg : message
                const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                const mediaData = await decryptMedia(encryptMedia, uaOverride)
                const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                client.sendImageAsSticker(from, imageBase64)
                .then(() => {
                    client.reply(from, 'Aqui está seu sticker 🥰')
                    console.log(`Adesivo processado em ${processTime(t, moment())} segundos`)
                })
                .catch(() => {
                    client.reply(from, 'Há um erro!')
                })
            } else if (args[0] === 'nobg') {
                if (isMedia || isQuotedImage) {
                    try {
                    var mediaData = await decryptMedia(message, uaOverride)
                    var imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                    var base64img = imageBase64
                    var outFile = './media/noBg.png'
		            // kamu dapat mengambil api key dari website remove.bg dan ubahnya difolder settings/api.json
                    var result = await removeBackgroundFromImageBase64({ base64img, apiKey: apiNoBg, size: 'auto', type: 'auto', outFile })
                    await fs.writeFile(outFile, result.base64img)
                    await client.sendImageAsSticker(from, `data:${mimetype};base64,${result.base64img}`)
                    } catch(err) {
                    console.log(err)
	   	            await client.reply(from, 'Desculpe, o limite de uso de hoje atingiu o máximo', id)
                    }
                }
            } else if (args.length === 1) {
                if (!isUrl(url)) { await client.reply(from, 'Desculpe, o link que você enviou é inválido.', id) }
                client.sendStickerfromUrl(from, url).then((r) => (!r && r !== undefined)
                    ? client.sendText(from, 'Desculpe, o link que você enviou não contém uma imagem.')
                    : client.reply(from, 'Aqui está seu sticker 🥰')).then(() => console.log(`Adesivo processado em ${processTime(t, moment())} Second`))
            } else {
                await client.reply(from, `Sem imagens! Usar ${prefix}sticker\n\n\nEnvie fotos com legendas\n${prefix}sticker <normal>\n${prefix}sticker nobg <sem fundo>\n\nOu enviar mensagem com\n${prefix}sticker <link da imagem>`, id)
            }
        break

        case 'stickergif':
        case 'stikergif':
            if (isMedia || isQuotedVideo) {
                if (mimetype === 'video/mp4' && message.duration < 10 || mimetype === 'image/gif' && message.duration < 10) {
                    var mediaData = await decryptMedia(message, uaOverride)
                    client.reply(from, '[WAIT] Em andamento⏳ aguarde ± 1 min!', id)
                    var filename = `./media/stickergif.${mimetype.split('/')[1]}`
                    await fs.writeFileSync(filename, mediaData)
                    await exec(`gify ${filename} ./media/stickergf.gif --fps=30 --scale=240:240`, async function (error, stdout, stderr) {
                        var gif = await fs.readFileSync('./media/stickergf.gif', { encoding: "base64" })
                        await client.sendImageAsSticker(from, `data:image/gif;base64,${gif.toString('base64')}`)
                        .catch(() => {
                            client.reply(from, 'Desculpe, o arquivo é muito grande!', id)
                        })
                    })
                  } else {
                    client.reply(from, `[❗] Envie um GIF com uma legenda *${prefix}stickergif* máximo de 10 segundos!`, id)
                   }
                } else {
		    client.reply(from, `[❗] Envie um GIF com uma legenda *${prefix}stickergif*`, id)
	        }
            break

        case 'stikergiphy':
        case 'stickergiphy':
            if (args.length !== 1) return client.reply(from, `Desculpe, o formato da mensagem está errado.\nDigite a mensagem com ${prefix}stickergiphy <link do Giphy>`, id)
            const isGiphy = url.match(new RegExp(/https?:\/\/(www\.)?giphy.com/, 'gi'))
            const isMediaGiphy = url.match(new RegExp(/https?:\/\/media.giphy.com\/media/, 'gi'))
            if (isGiphy) {
                const getGiphyCode = url.match(new RegExp(/(\/|\-)(?:.(?!(\/|\-)))+$/, 'gi'))
                if (!getGiphyCode) { return client.reply(from, 'Falha ao recuperar o código giphy', id) }
                const giphyCode = getGiphyCode[0].replace(/[-\/]/gi, '')
                const smallGifUrl = 'https://media.giphy.com/media/' + giphyCode + '/giphy-downsized.gif'
                client.sendGiphyAsSticker(from, smallGifUrl).then(() => {
                    client.reply(from, 'Aqui está seu sticker 🥰')
                    console.log(`Adesivo processado em ${processTime(t, moment())} Second`)
                }).catch((err) => console.log(err))
            } else if (isMediaGiphy) {
                const gifUrl = url.match(new RegExp(/(giphy|source).(gif|mp4)/, 'gi'))
                if (!gifUrl) { return client.reply(from, 'Falha ao recuperar o código giphy', id) }
                const smallGifUrl = url.replace(gifUrl[0], 'giphy-downsized.gif')
                client.sendGiphyAsSticker(from, smallGifUrl)
                .then(() => {
                    client.reply(from, 'Aqui está seu sticker 🥰')
                    console.log(`Adesivo processado em ${processTime(t, moment())} Second`)
                })
                .catch(() => {
                    client.reply(from, `Há um erro!`, id)
                })
            } else {
                await client.reply(from, 'Desculpe, o adesivo do comando Giphy só pode usar o link do Giphy.  [Giphy Only]', id)
            }
            break

        case 'memes':
            if ((isMedia || isQuotedImage) && args.length >= 2) {
                const top = arg.split('|')[0]
                const bottom = arg.split('|')[1]
                const encryptMedia = isQuotedImage ? quotedMsg : message
                const mediaData = await decryptMedia(encryptMedia, uaOverride)
                const getUrl = await uploadImages(mediaData, false)
                const ImageBase64 = await meme.custom(getUrl, top, bottom)
                client.sendFile(from, ImageBase64, 'image.png', '', null, true)
                    .then(() => {
                        client.reply(from, 'Obrigado!',id)
                    })
                    .catch(() => {
                        client.reply(from, 'Há um erro!')
                    })
            } else {
                await client.reply(from, `Sem imagem! Envie uma foto com uma legenda ${prefix}meme <texto_superior> | <texto_inferior>\nexemplo: ${prefix}meme texto principal | texto abaixo`, id)
            }
        break

        /*case 'quotemaker':
            const qmaker = body.trim().split('|')
            if (qmaker.length >= 3) {
                const quotes = qmaker[1]
                const author = qmaker[2]
                const theme = qmaker[3]
                client.reply(from, 'Prós como...', id)
                try {
                    const hasilqmaker = await images.quote(quotes, author, theme)
                    client.sendFileFromUrl(from, `${hasilqmaker}`, '', 'Este é irmão...', id)
                } catch {
                    client.reply('Bem, o processo falhou, irmão, ainda está correto?...', id)
                }
            } else {
                client.reply(from, `Use ${prefix}quotemaker |citação|autor|tema`)
            }
            break*/

        case 'nulis':
            if (args.length == 0) return client.reply(from, `Faça o bot escrever o texto que é enviado como imagem\nUse: ${prefix}nulis [teks]\n\nexemplo: ${prefix}nulis eu te amo`, id)
            const nulisq = body.slice(7)
            const nulisp = await rugaapi.tulis(nulisq)
            await client.sendImage(from, `${nulisp}`, '', 'Aqui...', id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break

        //Islam Command
        /*
        case 'listsurah':
            try {
                axios.get('https://raw.githubusercontent.com/clientZ/grabbed-results/main/islam/surah.json')
                .then((response) => {
                    let hehex = '╔══✪〘 List Surah 〙✪══\n'
                    for (let i = 0; i < response.data.data.length; i++) {
                        hehex += '╠➥ '
                        hehex += response.data.data[i].name.transliteration.id.toLowerCase() + '\n'
                            }
                        hehex += '╚═〘 *BOTIZINHO* 〙'
                    client.reply(from, hehex, id)
                })
            } catch(err) {
                client.reply(from, err, id)
            }
            break
        case 'infosurah':
            if (args.length == 0) return client.reply(from, `*_${prefix}infosurah <nama surah>_*\nMenampilkan informasi lengkap mengenai surah tertentu. Contoh penggunan: ${prefix}infosurah al-baqarah`, message.id)
                var responseh = await axios.get('https://raw.githubusercontent.com/clientZ/grabbed-results/main/islam/surah.json')
                var { data } = responseh.data
                var idx = data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                var pesan = ""
                pesan = pesan + "Nama : "+ data[idx].name.transliteration.id + "\n" + "Asma : " +data[idx].name.short+"\n"+"Arti : "+data[idx].name.translation.id+"\n"+"Jumlah ayat : "+data[idx].numberOfVerses+"\n"+"Nomor surah : "+data[idx].number+"\n"+"Jenis : "+data[idx].revelation.id+"\n"+"Keterangan : "+data[idx].tafsir.id
                client.reply(from, pesan, message.id)
              break
        case 'surah':
            if (args.length == 0) return client.reply(from, `*_${prefix}surah <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh Usar: : ${prefix}surah al-baqarah 1\n\n*_${prefix}surah <nama surah> <ayat> en/id_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Inggris / Indonesia. Contoh Usar: : ${prefix}surah al-baqarah 1 id`, message.id)
                var responseh = await axios.get('https://raw.githubusercontent.com/clientZ/grabbed-results/main/islam/surah.json')
                var { data } = responseh.data
                var idx = data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                nmr = data[idx].number
                if(!isNaN(nmr)) {
                  var responseh2 = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[1])
                  var {data} = responseh2.data
                  var last = function last(array, n) {
                    if (array == null) return void 0;
                    if (n == null) return array[array.length - 1];
                    return array.slice(Math.max(array.length - n, 0));
                  };
                  bhs = last(args)
                  pesan = ""
                  pesan = pesan + data.text.arab + "\n\n"
                  if(bhs == "en") {
                    pesan = pesan + data.translation.en
                  } else {
                    pesan = pesan + data.translation.id
                  }
                  pesan = pesan + "\n\n(Q.S. "+data.surah.name.transliteration.id+":"+args[1]+")"
                  client.reply(from, pesan, message.id)
                }
              break
        case 'tafsir':
            if (args.length == 0) return client.reply(from, `*_${prefix}tafsir <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahan dan tafsirnya dalam bahasa Indonesia. Contoh Usar: : ${prefix}tafsir al-baqarah 1`, message.id)
                var responsh = await axios.get('https://raw.githubusercontent.com/clientZ/grabbed-results/main/islam/surah.json')
                var {data} = responsh.data
                var idx = data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                nmr = data[idx].number
                if(!isNaN(nmr)) {
                  var responsih = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[1])
                  var {data} = responsih.data
                  pesan = ""
                  pesan = pesan + "Tafsir Q.S. "+data.surah.name.transliteration.id+":"+args[1]+"\n\n"
                  pesan = pesan + data.text.arab + "\n\n"
                  pesan = pesan + "_" + data.translation.id + "_" + "\n\n" +data.tafsir.id.long
                  client.reply(from, pesan, message.id)
              }
              break
        case 'alaudio':
            if (args.length == 0) return client.reply(from, `*_${prefix}ALaudio <nama surah>_*\nMenampilkan tautan dari audio surah tertentu. Contoh Usar: : ${prefix}ALaudio al-fatihah\n\n*_${prefix}ALaudio <nama surah> <ayat>_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh Usar: : ${prefix}ALaudio al-fatihah 1\n\n*_${prefix}ALaudio <nama surah> <ayat> en_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Inggris. Contoh Usar: : ${prefix}ALaudio al-fatihah 1 en`, message.id)
              ayat = "ayat"
              bhs = ""
                var responseh = await axios.get('https://raw.githubusercontent.com/clientZ/grabbed-results/main/islam/surah.json')
                var surah = responseh.data
                var idx = surah.data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                nmr = surah.data[idx].number
                if(!isNaN(nmr)) {
                  if(args.length > 2) {
                    ayat = args[1]
                  }
                  if (args.length == 2) {
                    var last = function last(array, n) {
                      if (array == null) return void 0;
                      if (n == null) return array[array.length - 1];
                      return array.slice(Math.max(array.length - n, 0));
                    };
                    ayat = last(args)
                  } 
                  pesan = ""
                  if(isNaN(ayat)) {
                    var responsih2 = await axios.get('https://raw.githubusercontent.com/clientZ/grabbed-results/main/islam/surah/'+nmr+'.json')
                    var {name, name_translations, number_of_ayah, number_of_surah,  recitations} = responsih2.data
                    pesan = pesan + "Audio Quran Surah ke-"+number_of_surah+" "+name+" ("+name_translations.ar+") "+ "dengan jumlah "+ number_of_ayah+" ayat\n"
                    pesan = pesan + "Dilantunkan oleh "+recitations[0].name+" : "+recitations[0].audio_url+"\n"
                    pesan = pesan + "Dilantunkan oleh "+recitations[1].name+" : "+recitations[1].audio_url+"\n"
                    pesan = pesan + "Dilantunkan oleh "+recitations[2].name+" : "+recitations[2].audio_url+"\n"
                    client.reply(from, pesan, message.id)
                  } else {
                    var responsih2 = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+ayat)
                    var {data} = responsih2.data
                    var last = function last(array, n) {
                      if (array == null) return void 0;
                      if (n == null) return array[array.length - 1];
                      return array.slice(Math.max(array.length - n, 0));
                    };
                    bhs = last(args)
                    pesan = ""
                    pesan = pesan + data.text.arab + "\n\n"
                    if(bhs == "en") {
                      pesan = pesan + data.translation.en
                    } else {
                      pesan = pesan + data.translation.id
                    }
                    pesan = pesan + "\n\n(Q.S. "+data.surah.name.transliteration.id+":"+args[1]+")"
                    await client.sendFileFromUrl(from, data.audio.secondary[0])
                    await client.reply(from, pesan, message.id)
                  }
              }
              break
        case 'jsolat':
            if (args.length == 0) return client.reply(from, `Untuk melihat jadwal solat dari setiap daerah yang ada\nUso: ${prefix}jsolat [daerah]\n\nuntuk list daerah yang ada\nUso: ${prefix}daerah`, id)
            const solatx = body.slice(8)
            const solatj = await rugaapi.jadwaldaerah(solatx)
            await client.reply(from, solatj, id)
            .catch(() => {
                client.reply(from, 'Pastikan daerah kamu ada di list ya!', id)
            })
            break
        case 'daerah':
            const daerahq = await rugaapi.daerah()
            await client.reply(from, daerahq, id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break
            */
           
        //Media
        case 'ytmp3':
            if (args.length == 0) return client.reply(from, `Para baixar músicas do youtube\nUso: ${prefix}ytmp3 [link_yt]`, id)
            const linkmp3 = args[0].replace('https://youtu.be/','').replace('https://www.youtube.com/watch?v=','')
			rugaapi.ytmp3(`https://youtu.be/${linkmp3}`)
            .then(async(res) => {
				if (res.error) return client.sendFileFromUrl(from, `${res.url}`, '', `${res.error}`)
				await client.sendFileFromUrl(from, `${res.result.thumb}`, '', `Música encontrada\nTítulo: ${res.result.title}\nPreparando download...`, id)
				await client.sendFileFromUrl(from, `${res.result.url}`, '', `${res.result.title}.mp3`, id)
				.catch(() => {
					client.reply(from, `URL INI ${args[0]} JÁ BAIXOU ANTERIORMENTE .. O URL IRÁ RESETAR APÓS 60 MINUTOS`, id)
				})
			})
            break
        case 'ytmp4':
            if (args.length == 0) return client.reply(from, `Para baixar músicas do youtube\nUso: ${prefix}ytmp3 [link_yt]`, id)
            const linkmp4 = args[0].replace('https://youtu.be/','').replace('https://www.youtube.com/watch?v=','')
			rugaapi.ytmp4(`https://youtu.be/${linkmp4}`)
            .then(async(res) => {
				if (res.error) return client.sendFileFromUrl(from, `${res.url}`, '', `${res.error}`)
				await client.sendFileFromUrl(from, `${res.result.thumb}`, '', `Vídeo encontrado\nTítulo: ${res.result.title}\nPreparando download...`, id)
				await client.sendFileFromUrl(from, `${res.result.url}`, '', `${res.result.title}.mp4`, id)
				.catch(() => {
					client.reply(from, `URL INI ${args[0]} JÁ BAIXOU ANTERIORMENTE .. O URL IRÁ RESETAR APÓS 60 MINUTOS`, id)
				})
			})
            break
		case 'fb':
		case 'facebook':
			if (args.length == 0) return client.reply(from, `Para baixar vídeos do facebook\nUso: ${prefix}fb [link_fb]`, id)
			rugaapi.fb(args[0])
			.then(async (res) => {
				const { link, linkhd, linksd } = res
				if (res.status == 'error') return client.sendFileFromUrl(from, link, '', 'Desculpe, seu url não foi encontrado', id)
				await client.sendFileFromUrl(from, linkhd, '', 'Aqui esta o video', id)
				.catch(async () => {
					await client.sendFileFromUrl(from, linksd, '', 'Aqui esta o video', id)
					.catch(() => {
						client.reply(from, 'Desculpe, seu url não foi encontrado', id)
					})
				})
			})
			break
        //Primbon Menu
        /*
		case 'artinama':
			if (args.length == 0) return client.reply(from, `Para descobrir o significado do nome de alguém\nUse ${prefix}artinama namakamu`, id)
            rugaapi.artinama(body.slice(10))
			.then(async(res) => {
				await client.reply(from, `Arti : ${res}`, id)
			})
			break
		case 'cekjodoh':
			if (args.length !== 2) return client.reply(from, `Untuk mengecek jodoh melalui nama\nUso: ${prefix}cekjodoh nama-kamu nama-pasangan\n\nexemplo: ${prefix}cekjodoh bagas siti\n\nhanya bisa pakai nama panggilan (satu kata)`)
			rugaapi.cekjodoh(args[0],args[1])
			.then(async(res) => {
				await client.sendFileFromUrl(from, `${res.link}`, '', `${res.text}`, id)
			})
			break
            */
            
        // Random Kata
        /*
        case 'fakta':
            fetch('https://raw.githubusercontent.com/clientZ/grabbed-results/main/random/faktaunix.txt')
            .then(res => res.text())
            .then(body => {
                let splitnix = body.split('\n')
                let randomnix = splitnix[Math.floor(Math.random() * splitnix.length)]
                client.reply(from, randomnix, id)
            })
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break
        case 'katabijak':
            fetch('https://raw.githubusercontent.com/clientZ/grabbed-results/main/random/katabijax.txt')
            .then(res => res.text())
            .then(body => {
                let splitbijak = body.split('\n')
                let randombijak = splitbijak[Math.floor(Math.random() * splitbijak.length)]
                client.reply(from, randombijak, id)
            })
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break
        case 'pantun':
            fetch('https://raw.githubusercontent.com/clientZ/grabbed-results/main/random/pantun.txt')
            .then(res => res.text())
            .then(body => {
                let splitpantun = body.split('\n')
                let randompantun = splitpantun[Math.floor(Math.random() * splitpantun.length)]
                client.reply(from, randompantun.replace(/client-line/g,"\n"), id)
            })
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break
        case 'quote':
            const quotex = await rugaapi.quote()
            await client.reply(from, quotex, id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break
		case 'cerpen':
			rugaapi.cerpen()
			.then(async (res) => {
				await client.reply(from, res.result, id)
			})
			break
		case 'cersex':
			rugaapi.cersex()
			.then(async (res) => {
				await client.reply(from, res.result, id)
			})
			break
		case 'puisi':
			rugaapi.puisi()
			.then(async (res) => {
				await client.reply(from, res.result, id)
			})
            break
            */

        //Random Images
        case 'anime':
            if (args.length == 0) return client.reply(from, `Usar ${prefix}anime\nPor favor use: ${prefix}anime [pesquisa]\nexemplo: ${prefix}anime random\n\nconsultas disponíveis:\nrandom, waifu, husbu, neko`, id)
            if (args[0] == 'random' || args[0] == 'waifu' || args[0] == 'husbu' || args[0] == 'neko') {
                fetch('https://raw.githubusercontent.com/clientZ/grabbed-results/main/random/anime/' + args[0] + '.txt')
                .then(res => res.text())
                .then(body => {
                    let randomnime = body.split('\n')
                    let randomnimex = randomnime[Math.floor(Math.random() * randomnime.length)]
                    client.sendFileFromUrl(from, randomnimex, '', 'Nee..', id)
                })
                .catch(() => {
                    client.reply(from, 'Há um erro!', id)
                })
            } else {
                client.reply(from, `Desculpe, a consulta não está disponível. Por favor digite ${prefix}anime para ver a lista de consulta`)
            }
        break

        case 'kpop':
            if (args.length == 0) return client.reply(from, `Usar ${prefix}kpop\nPor favor use: ${prefix}kpop [Pesquisa]\nexemplo: ${prefix}kpop bts\n\nconsultas disponíveis:\nblackpink, exo, bts`, id)
            if (args[0] == 'blackpink' || args[0] == 'exo' || args[0] == 'bts') {
                fetch('https://raw.githubusercontent.com/clientZ/grabbed-results/main/random/kpop/' + args[0] + '.txt')
                .then(res => res.text())
                .then(body => {
                    let randomkpop = body.split('\n')
                    let randomkpopx = randomkpop[Math.floor(Math.random() * randomkpop.length)]
                    client.sendFileFromUrl(from, randomkpopx, '', 'Não..', id)
                })
                .catch(() => {
                    client.reply(from, 'Há um erro!', id)
                })
            } else {
                client.reply(from, `Desculpe, a consulta não está disponível. Por favor digite ${prefix}kpop para ver a lista de consulta`)
            }
        break

        case 'memes':
            const randmeme = await meme.random()
            client.sendFileFromUrl(from, randmeme, '', '', id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
            break
        
        // Search Any
        case 'images':
            if (args.length == 0) return client.reply(from, `Para pesquisar imagens no pinterest\nUso: ${prefix}images [pesquisa]\nexemplo: ${prefix}images naruto`, id)
            const cariwall = body.slice(8)
            const hasilwall = await images.fdci(cariwall)
            await client.sendFileFromUrl(from, hasilwall, '', '', id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'sreddit':
            if (args.length == 0) return client.reply(from, `Para procurar imagens no sub reddit\nUso: ${prefix}sreddit [Pesquisa]\nexemplo: ${prefix}sreddit naruto`, id)
            const carireddit = body.slice(9)
            const hasilreddit = await images.sreddit(carireddit)
            await client.sendFileFromUrl(from, hasilreddit, '', '', id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break
        
        /*
        case 'receita':
            if (args.length == 0) return client.reply(from, `Para encontrar receitas de comida\nExemplo de uso: ${prefix}receita [Pesquisa]\n\nexemplo: ${prefix}receita tofu`, id)
            const carireceita = body.slice(7)
            const hasilreceita = await receita.receita(carireceita)
            await client.reply(from, hasilreceita + '\n\nEssa é a receita da comida...', id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break
*/
        case 'nekopoi':
             rugapoi.getLatest()
            .then((result) => {
                rugapoi.getVideo(result.link)
                .then((res) => {
                    let heheq = '\n'
                    for (let i = 0; i < res.links.length; i++) {
                        heheq += `${res.links[i]}\n`
                    }
                    client.reply(from, `Title: ${res.title}\n\nLink:\n${heheq}\nmasih tester bntr :v`)
                })
            })
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'stalkig':
            if (args.length == 0) return client.reply(from, `Para stalkear a conta de alguém no Instagram\nuse ${prefix}stalkig [nome do usuário]\nexemplo: ${prefix}stalkig marii_potiens`, id)
            const igstalk = await rugaapi.stalkig(args[0])
            const igstalkpict = await rugaapi.stalkigpict(args[0])
            await client.sendFileFromUrl(from, igstalkpict, '', igstalk, id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'wiki':
            if (args.length == 0) return client.reply(from, `Para encontrar uma palavra da wikipedia\nUse: ${prefix}wiki [kata]`, id)
            const wikip = body.slice(6)
            const wikis = await rugaapi.wiki(wikip)
            await client.reply(from, wikis, id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'tempo':
        case 'clima':
            if (args.length == 0) return client.reply(from, `Para ver o clima em uma área\nUse: ${prefix}cuaca [área]`, id)
            const cuacaq = body.slice(7)
            const cuacap = await rugaapi.cuaca(cuacaq)
            await client.reply(from, cuacap, id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'lyrics':
        case 'letra':
            if (args.length == 0) return client.reply(from, `Para pesquisar a letra de uma música\bUse: ${prefix}letra [título da música]`, id)
            rugaapi.lirik(body.slice(7))
            .then(async (res) => {
                await client.reply(from, `Letra da música: ${body.slice(7)}\n\n${res}`, id)
            })
        break

        case 'acordes':
        case 'cifra':
        case 'chord':
            if (args.length == 0) return client.reply(from, `Para pesquisar as letras e acordes de uma música\bUso: ${prefix}chord [título da música]`, id)
            const chordq = body.slice(7)
            const chordp = await rugaapi.chord(chordq)
            await client.reply(from, chordp, id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'ss': //jika error silahkan buka file di folder settings/api.json dan ubah apiSS 'API-KEY' yang kalian dapat dari website https://apiflash.com/
            if (args.length == 0) return client.reply(from, `Faça a captura de tela dos bots em uma web\n\nUse: ${prefix}ss [url]\n\nexemplo: ${prefix}ss http://google.com`, id)
            const scrinshit = await meme.ss(args[0])
            await client.sendFile(from, scrinshit, 'ss.jpg', 'cekrek', id)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        case 'play'://silahkan kalian custom sendiri jika ada yang ingin diubah
            if (args.length == 0) return client.reply(from, `Para procurar músicas do youtube\n\nUsar:: ${prefix}play [título da música]`, id)
            axios.get(`https://clientytdl.herokuapp.com/search?q=${body.slice(6)}`)
            .then(async (res) => {
                await client.sendFileFromUrl(from, `${res.data[0].thumbnail}`, ``, `Música encontrada\n\nTítulo: ${res.data[0].title}\nDuração: ${res.data[0].duration}detik\nEnviada em: ${res.data[0].uploadDate}\nVisualizações: ${res.data[0].viewCount}\n\nestá sendo enviado`, id)
				rugaapi.ytmp3(`https://youtu.be/${res.data[0].id}`)
				.then(async(res) => {
					if (res.status == 'error') return client.sendFileFromUrl(from, `${res.link}`, '', `${res.error}`)
					await client.sendFileFromUrl(from, `${res.thumb}`, '', `Música encontrada\n\nJudul ${res.title}\n\nSabar lagi dikirim`, id)
					await client.sendFileFromUrl(from, `${res.link}`, '', '', id)
					.catch(() => {
						client.reply(from, `URL INI ${args[0]} JÁ BAIXOU ANTERIORMENTE .. O URL IRÁ RESETAR APÓS 60 MINUTOS`, id)
					})
				})
            })
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

		case 'movie':
			if (args.length == 0) return client.reply(from, `Para pesquisar um filme no site sdmovie.fun\nUso: ${prefix}movie [o título]`, id)
			rugaapi.movie((body.slice(7)))
			.then(async (res) => {
				if (res.status == 'error') return client.reply(from, res.hasil, id)
				await client.sendFileFromUrl(from, res.link, 'movie.jpg', res.hasil, id)
			})
        break
        
        case 'qualanime':
        case 'whatanime':
            if (isMedia && type === 'image' || quotedMsg && quotedMsg.type === 'image') {
                if (isMedia) {
                    var mediaData = await decryptMedia(message, uaOverride)
                } else {
                    var mediaData = await decryptMedia(quotedMsg, uaOverride)
                }
                const fetch = require('node-fetch')
                const imgBS4 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                client.reply(from, 'Procurando....', id)
                fetch('https://trace.moe/api/search', {
                    method: 'POST',
                    body: JSON.stringify({ image: imgBS4 }),
                    headers: { "Content-Type": "application/json" }
                })
                .then(respon => respon.json())
                .then(resolt => {
                	if (resolt.docs && resolt.docs.length <= 0) {
                		client.reply(from, 'Desculpe, não sei o que é este anime, certifique-se de que a imagem a ser pesquisada não está desfocada / cortada', id)
                	}
                    const { is_adult, title, title_chinese, title_romaji, title_english, episode, similarity, filename, at, tokenthumb, anilist_id } = resolt.docs[0]
                    teks = ''
                    if (similarity < 0.92) {
                    	teks = '*Eu tenho pouca fé nisso* :\n\n'
                    }
                    teks += `➸ *Título Japonês* : ${title}\n➸ *Título chinês* : ${title_chinese}\n➸ *Título em romaji* : ${title_romaji}\n➸ *Título Inglês* : ${title_english}\n`
                    teks += `➸ *R-18?* : ${is_adult}\n`
                    teks += `➸ *Eps* : ${episode.toString()}\n`
                    teks += `➸ *Semelhança* : ${(similarity * 100).toFixed(1)}%\n`
                    var video = `https://media.trace.moe/video/${anilist_id}/${encodeURIComponent(filename)}?t=${at}&token=${tokenthumb}`;
                    client.sendFileFromUrl(from, video, 'anime.mp4', teks, id).catch(() => {
                        client.reply(from, teks, id)
                    })
                })
                .catch(() => {
                    client.reply(from, 'Há um erro!', id)
                })
            } else {
				client.reply(from, `Desculpe, o formato está errado\n\nEnvie uma foto com uma legenda ${prefix}qualanime\n\nOu responda a fotos com legendas ${prefix}qualanime`, id)
			}
            break
            
        // Other Command
        /*
        case 'resi':
            if (args.length !== 2) return client.reply(from, `Desculpe, o formato da mensagem está errado.\nPor favor, envie uma mensagem com ${prefix}resi <kurir> <no_resi>\n\nCorreio disponível:\njne, pos, tiki, wahana, jnt, rpx, sap, sicepat, pcp, jet, dse, first, ninja, lion, idl, rex`, id)
            const kurirs = ['jne', 'pos', 'tiki', 'wahana', 'jnt', 'rpx', 'sap', 'sicepat', 'pcp', 'jet', 'dse', 'first', 'ninja', 'lion', 'idl', 'rex']
            if (!kurirs.includes(args[0])) return client.sendText(from, `O tipo de extensão não é compatível. Este serviço só oferece suporte para ${kurirs.join(', ')} Por favor tente novamente.`)
            console.log('Memeriksa No Resi', args[1], 'dengan ekspedisi', args[0])
            cekResi(args[0], args[1]).then((result) => client.sendText(from, result))
        break
        */

        case 'tts':
            if (args.length == 0) return client.reply(from, `Converte texto em som (google voice)\nUso: ${prefix}tts <código de linguagem> <texto>\ncontoh : ${prefix}tts id halo\npara o código do idioma verifique aqui : https://anotepad.com/note/read/5xqahdy8`)
            const ttsGB = require('node-gtts')(args[0])
            const dataText = body.slice(8)
                if (dataText === '') return client.reply(from, 'qual é o texto?...', id)
                try {
                    ttsGB.save('./media/tts.mp3', dataText, function () {
                    client.sendPtt(from, './media/tts.mp3', id)
                    })
                } catch (err) {
                    client.reply(from, err, id)
                }
        break

        case 'meia-noite':
            try {
                client.sendPtt(from, './media/meia-noite.mp3', id)
                } catch (err) {
                    client.reply(from, err, id)
                }
            break
                
        case 'translate':
            if (args.length != 1) return client.reply(from, `Desculpe, o formato da mensagem está errado.\nResponda a uma mensagem com uma legenda ${prefix}translate <código de linguagem>\ncontoh ${prefix}translate id`, id)
            if (!quotedMsg) return client.reply(from, `Desculpe, o formato da mensagem está errado.\nResponda a uma mensagem com uma legenda ${prefix}translate <código de linguagem>\ncontoh ${prefix}translate id`, id)
            const quoteText = quotedMsg.type == 'chat' ? quotedMsg.body : quotedMsg.type == 'image' ? quotedMsg.caption : ''
            translate(quoteText, args[0])
                .then((result) => client.sendText(from, result))
                .catch(() => client.sendText(from, 'Error, Kode bahasa salah.'))
        break

        /*
		case 'covidindo':
			rugaapi.covidindo()
			.then(async (res) => {
				await client.reply(from, `${res}`, id)
			})
            break
        */

        /*
        case 'verificarlocalização':
            if (quotedMsg.type !== 'location') return client.reply(from, `Desculpe, o formato da mensagem está errado.\nKEnvie a localização e responda com uma legenda ${prefix}ceklokasi`, id)
            console.log(`Request Status Zona Penyebaran Covid-19 (${quotedMsg.lat}, ${quotedMsg.lng}).`)
            const zoneStatus = await getLocationData(quotedMsg.lat, quotedMsg.lng)
            if (zoneStatus.kode !== 200) client.sendText(from, 'Desculpe, ocorreu um erro ao verificar o local que você enviou.')
            let datax = ''
            for (let i = 0; i < zoneStatus.data.length; i++) {
                const { zone, region } = zoneStatus.data[i]
                const _zone = zone == 'green' ? 'Hijau* (Aman) \n' : zone == 'yellow' ? 'Kuning* (Waspada) \n' : 'Merah* (Bahaya) \n'
                datax += `${i + 1}. Kel. *${region}* Berstatus *Zona ${_zone}`
            }
            const text = `*VERIFIQUE A LOCALIZAÇÃO DO SPREAD DE COVID-19 *\nOs resultados da inspeção do local que você enviou são *${zoneStatus.status}* ${zoneStatus.optional}\n\nInformações sobre os locais afetados perto de você:\n${datax}`
            client.sendText(from, text)
            break
        */

        case 'encurtarlink':
        case 'shortlink':
            if (args.length == 0) return client.reply(from, `Use: ${prefix}encurtarlink <url>`, id)
            if (!isUrl(args[0])) return client.reply(from, 'Desculpe, o url que você enviou é inválido.', id)
            const shortlink = await urlShortener(args[0])
            await client.sendText(from, shortlink)
            .catch(() => {
                client.reply(from, 'Há um erro!', id)
            })
        break

        /*
		case 'bapakfont':
			if (args.length == 0) return client.reply(from, `Converte frases para alayyyyy\n\nUse: ${prefix}bapakfont [sentença]`, id)
			rugaapi.bapakfont(body.slice(11))
			.then(async(res) => {
				await client.reply(from, `${res}`, id)
			})
		break
        */
        
        //Fun Menu
        /*
        case 'klasemen':
		case 'klasmen':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
			const klasemen = db.get('group').filter({id: groupId}).map('members').value()[0]
            let urut = Object.entries(klasemen).map(([key, val]) => ({id: key, ...val})).sort((a, b) => b.denda - a.denda);
            let textKlas = "*Classificação de multas temporárias*\n"
            let i = 1;
            urut.forEach((klsmn) => {
            textKlas += i+". @"+klsmn.id.replace('@c.us', '')+" ➤ Rp"+formatin(klsmn.denda)+"\n"
            i++
            });
            await client.sendTextWithMentions(from, textKlas)
            break
            */

        // Comandos de grupo (apenas administrador de grupo)
	    case 'add':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
	        if (args.length !== 1) return client.reply(from, `Usar ${prefix}add\nUsar: ${prefix}add <número>\nexemplo: ${prefix}add 628xxx`, id)
                try {
                    await client.addParticipant(from,`${args[0]}@c.us`)
                } catch {
                    client.reply(from, 'Incapaz de adicionar alvo', id)
                }
        break

        case 'kick':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
            if (mentionedJidList.length === 0) return client.reply(from, 'Desculpe, o formato da mensagem está errado.\nSilahkan tag satu atau lebih orang yang akan dikeluarkan', id)
            if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Desculpe, o formato da mensagem está errado.\nTidak dapat mengeluarkan akun bot sendiri', id)
            await client.sendTextWithMentions(from, `Solicitação recebida, problema:\n${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')}`)
            for (let i = 0; i < mentionedJidList.length; i++) {
                if (groupAdmins.includes(mentionedJidList[i])) return await client.sendText(from, 'Falha, você não pode remover o administrador do grupo.')
                await client.removeParticipant(groupId, mentionedJidList[i])
            }
        break

        case 'promote':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
            if (mentionedJidList.length !== 1) return client.reply(from, 'Maaf, hanya bisa mempromote 1 user', id)
            if (groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Desculpe, o usuário já é um administrador.', id)
            if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Desculpe, o formato da mensagem está errado.\nTidak dapat mempromote akun bot sendiri', id)
            await client.promoteParticipant(groupId, mentionedJidList[0])
            await client.sendTextWithMentions(from, `Pedido aceito, adicionado @${mentionedJidList[0].replace('@c.us', '')} sebagai admin.`)
        break

        case 'demote':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
            if (mentionedJidList.length !== 1) return client.reply(from, 'Desculpe, apenas 1 usuário pode ser demonstrado', id)
            if (!groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Desculpe, o usuário ainda não é um administrador.', id)
            if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Desculpe, o formato da mensagem está errado.\nTidak dapat mendemote akun bot sendiri', id)
            await client.demoteParticipant(groupId, mentionedJidList[0])
            await client.sendTextWithMentions(from, `Pedido aceito, remover posição @${mentionedJidList[0].replace('@c.us', '')}.`)
        break

        case 'bye':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            client.sendText(from, 'Adeus... ( ⇀‸↼‶ )').then(() => client.leaveGroup(groupId))
        break

        case 'del':
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!quotedMsg) return client.reply(from, `Desculpe, o formato da mensagem está errado, por favor.\nResponda às mensagens do bot com uma legenda ${prefix}del`, id)
            if (!quotedMsgObj.fromMe) return client.reply(from, `Desculpe, o formato da mensagem está errado, por favor.\nResponda às mensagens do bot com uma legenda ${prefix}del`, id)
            client.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
        break

        case 'tagall':
        case 'everyone':
            if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            const groupMem = await client.getGroupMembers(groupId)
            let hehex = '╔══✪〘 Mencione tudos 〙✪══\n'
            for (let i = 0; i < groupMem.length; i++) {
                hehex += '╠➥'
                hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
            }
            hehex += '╚═〘 *BOTIZINHO* 〙'
            await client.sendTextWithMentions(from, hehex)
        break

		case 'simisimi':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
			client.reply(from, `Para habilitar simi-simi no Chat de Grupo\n\nUsar:\n${prefix}simi on --ativar\n${prefix}simi off --desligar\n`, id)
        break
        
		case 'simi':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
			if (args.length !== 1) return client.reply(from, `Para habilitar simi-simi no Chat de Grupo\n\nUsar:\n${prefix}simi on --ativar\n${prefix}simi off --desligar\n`, id)
			if (args[0] == 'on') {
				simi.push(chatId)
				fs.writeFileSync('./settings/simi.json', JSON.stringify(simi))
                client.reply(from, 'Ativar bot simi-simi!', id)
			} else if (args[0] == 'off') {
				let inxx = simi.indexOf(chatId)
				simi.splice(inxx, 1)
				fs.writeFileSync('./settings/simi.json', JSON.stringify(simi))
				client.reply(from, 'Companheiro bot simi-simi!', id)
			} else {
				client.reply(from, `Para habilitar simi-simi no Chat de Grupo\n\nUsar:\n${prefix}simi on --ativar\n${prefix}simi off --desligar\n`, id)
			}
        break
        
		case 'palavrões':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
			client.reply(from, `Para ativar o recurso Palavras fortes no Chat de Grupo\n\nPara que serve esse recurso? Se alguém disser palavras duras, ele receberá uma avisos\n\nUsar:\n${prefix}kasar on --ativar\n${prefix}kasar off --desligar\n\n${prefix}reset --reset jumlah denda`, id)
            break
            
		case 'Rude':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
			if (args.length !== 1) return client.reply(from, `Para ativar o recurso Palavras fortes no Chat de Grupo\n\nPara que serve esse recurso? Se alguém disser palavras duras, ele receberá uma avisos\n\nUsar:\n${prefix}kasar on --ativar\n${prefix}kasar off --desligar\n\n${prefix}reset --reset jumlah denda`, id)
			if (args[0] == 'on') {
				ngegas.push(chatId)
				fs.writeFileSync('./settings/ngegas.json', JSON.stringify(ngegas))
				client.reply(from, 'O recurso Anti-Crude foi ativado', id)
			} else if (args[0] == 'off') {
				let nixx = ngegas.indexOf(chatId)
				ngegas.splice(nixx, 1)
				fs.writeFileSync('./settings/ngegas.json', JSON.stringify(ngegas))
				client.reply(from, 'O recurso Anti-Crude foi desativado', id)
			} else {
				client.reply(from, `Para ativar o recurso Palavras fortes no Chat de Grupo\n\nPara que serve esse recurso? Se alguém disser palavras duras, ele receberá uma avisos\n\nUsar:\n${prefix}kasar on --ativar\n${prefix}kasar off --desligar\n\n${prefix}reset --reset jumlah denda`, id)
			}
            break
            
		case 'reset':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
			const reset = db.get('group').find({ id: groupId }).assign({ members: []}).write()
            if(reset){
				await client.sendText(from, "A classificação foi reiniciada.")
            }
        break
            
		case 'mutegrup':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
			if (args.length !== 1) return client.reply(from, `Para alterar as configurações do chat em grupo para que apenas o administrador possa bater papo\n\nUsar::\n${prefix}mutegrup on --ativar\n${prefix}mutegrup off --desligar`, id)
            if (args[0] == 'on') {
				client.setGroupToAdminsOnly(groupId, true).then(() => client.sendText(from, 'Alterado com sucesso para que apenas o administrador possa conversar!'))
			} else if (args[0] == 'off') {
				client.setGroupToAdminsOnly(groupId, false).then(() => client.sendText(from, 'Alterado com sucesso para que todos os membros possam conversar!'))
			} else {
				client.reply(from, `Para alterar as configurações do chat em grupo para que apenas o administrador possa conversar\n\nUsar:\n${prefix}mutegrup on --ativar\n${prefix}mutegrup off --desligar`, id)
			}
        break
        
		case 'setprofile':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
			if (isMedia && type == 'image' || isQuotedImage) {
				const dataMedia = isQuotedImage ? quotedMsg : message
				const _mimetype = dataMedia.mimetype
				const mediaData = await decryptMedia(dataMedia, uaOverride)
				const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
				await client.setGroupIcon(groupId, imageBase64)
			} else if (args.length === 1) {
				if (!isUrl(url)) { await client.reply(from, 'Desculpe, o link que você enviou é inválido.', id) }
				client.setGroupIconByUrl(groupId, url).then((r) => (!r && r !== undefined)
				? client.reply(from, 'Desculpe, o link que você enviou não contém uma imagem.', id)
				: client.reply(from, 'Alterou com sucesso o perfil do grupo', id))
			} else {
				client.reply(from, `Este comando é usado para mudar o ícone / perfil do grupo de chat\n\n\nUsar:\n1. Envie / responda uma imagem com uma legenda ${prefix}setprofile\n\n2. Por favor digite ${prefix}setprofile [link da imagem]`)
			}
        break
        
		case 'welcome':
			if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
            if (!isGroupAdmins) return client.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
            if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
			if (args.length !== 1) return client.reply(from, `Faça o BOT cumprimentar os membros que acabaram de entrar no grupo de bate-papo!\n\nUsar:\n${prefix}welcome on --ativar\n${prefix}welcome off --desligar`, id)
			if (args[0] == 'on') {
				welcome.push(chatId)
				fs.writeFileSync('./settings/welcome.json', JSON.stringify(welcome))
				client.reply(from, 'A mensagem de boas-vindas já está disponível!', id)
			} else if (args[0] == 'off') {
				let xporn = welcome.indexOf(chatId)
				welcome.splice(xporn, 1)
				fs.writeFileSync('./settings/welcome.json', JSON.stringify(welcome))
				client.reply(from, 'A mensagem de boas-vindas agora não é exibida', id)
			} else {
				client.reply(from, `Faça o BOT cumprimentar os membros que acabaram de entrar no grupo de bate-papo!\n\nUsar:\n${prefix}welcome on --ativar\n${prefix}welcome off --desligar`, id)
			}
			break
			
        //Owner Group
        case 'kickall': //mengeluarkan semua member
        if (!isGroupMsg) return client.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
        let isOwner = chat.groupMetadata.owner == pengirim
        if (!isOwner) return client.reply(from, 'Desculpe, este comando só pode ser usado pelo proprietário do grupo!', id)
        if (!isBotGroupAdmins) return client.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
            const allMem = await client.getGroupMembers(groupId)
            for (let i = 0; i < allMem.length; i++) {
                if (groupAdmins.includes(allMem[i].id)) {

                } else {
                    await client.removeParticipant(groupId, allMem[i].id)
                }
            }
            client.reply(from, 'Sucesso em chutar todos os membros', id)
        break

        //Owner Bot
        case 'ban':
            if (!isOwnerBot) return client.reply(from, 'Este pedido é apenas para proprietários do Bot!', id)
            if (args.length == 0) return client.reply(from, `Para banir alguém de usar comandos\n\nComo usar: \n${prefix}ban add 628xx --para ativar\n${prefix}ban del 628xx --para desativar\n\njeito rápido e muito use:\n${prefix}ban @tag @tag @tag`, id)
            if (args[0] == 'add') {
                banned.push(args[1]+'@c.us')
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                client.reply(from, 'Alvo banido com sucesso!')
            } else
            if (args[0] == 'del') {
                let xnxx = banned.indexOf(args[1]+'@c.us')
                banned.splice(xnxx,1)
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                client.reply(from, 'Destino desbanido com sucesso!')
            } else {
             for (let i = 0; i < mentionedJidList.length; i++) {
                banned.push(mentionedJidList[i])
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                client.reply(from, 'Alvo banido com sucesso!', id)
                }
            }
        break

        case 'bc': //untuk broadcast atau promosi
            if (!isOwnerBot) return client.reply(from, 'Este pedido é apenas para proprietários do Bot!', id)
            if (args.length == 0) return client.reply(from, `Para transmitir para todos os chats Uso:\n${prefix}bc [preencha o chat]`)
            let msg = body.slice(4)
            const chatz = await client.getAllChatIds()
            for (let idk of chatz) {
                var cvk = await client.getChatById(idk)
                if (!cvk.isReadOnly) client.sendText(idk, `〘 *BOT Broadcast* 〙\n\n${msg}`)
                if (cvk.isReadOnly) client.sendText(idk, `〘 *BOT Broadcast 〙\n\n${msg}`)
            }
            client.reply(from, 'Sucesso na transmissão!', id)
        break

        case 'leaveall': //mengeluarkan bot dari semua group serta menghapus chatnya
            if (!isOwnerBot) return client.reply(from, 'Este comando é apenas para proprietários do bot', id)
            const allChatz = await client.getAllChatIds()
            const allGroupz = await client.getAllGroups()
            for (let gclist of allGroupz) {
                await client.sendText(gclist.contact.id, `Desculpe, o bot está limpando, chat total está ativo : ${allChatz.length}`)
                await client.leaveGroup(gclist.contact.id)
                await client.deleteChat(gclist.contact.id)
            }
            client.reply(from, 'Success leave all group!', id)
        break

        case 'clearall': //menghapus seluruh pesan diakun bot
            if (!isOwnerBot) return client.reply(from, 'Este comando é apenas para proprietários do bot', id)
            const allChatx = await client.getAllChats()
            for (let dchat of allChatx) {
                await client.deleteChat(dchat.id)
            }
            client.reply(from, 'Success clear all chat!', id)
            break
        default:
            break
        }
		
		// Simi-simi function
		if ((!isCmd && isGroupMsg && isSimi) && message.type === 'chat') {
			axios.get(`https://clientz.herokuapp.com/api/simisimi?kata=${encodeURIComponent(message.body)}&apikey=${apiSimi}`)
			.then((res) => {
				if (res.data.status == 403) return client.sendText(ownerNumber, `${res.data.result}\n\n${res.data.pesan}`)
				client.reply(from, `Simi disse: ${res.data.result}`, id)
			})
			.catch((err) => {
				client.reply(from, `${err}`, id)
			})
		}
		
		// Kata kasar function
		if(!isCmd && isGroupMsg && isNgegas) {
            const find = db.get('group').find({ id: groupId }).value()
            if(find && find.id === groupId){
                const cekuser = db.get('group').filter({id: groupId}).map('members').value()[0]
                const isIn = inArray(pengirim, cekuser)
                if(cekuser && isIn !== false){
                    if(isKasar){
                        const denda = db.get('group').filter({id: groupId}).map('members['+isIn+']').find({ id: pengirim }).update('denda', n => n + 5000).write()
                        if(denda){
                            await client.reply(from, "Não seja um palavrão estúpido\nBem +5.000\nTotal : Rp"+formatin(denda.denda), id)
                        }
                    }
                } else {
                    const cekMember = db.get('group').filter({id: groupId}).map('members').value()[0]
                    if(cekMember.length === 0){
                        if(isKasar){
                            db.get('group').find({ id: groupId }).set('members', [{id: pengirim, denda: 5000}]).write()
                        } else {
                            db.get('group').find({ id: groupId }).set('members', [{id: pengirim, denda: 0}]).write()
                        }
                    } else {
                        const cekuser = db.get('group').filter({id: groupId}).map('members').value()[0]
                        if(isKasar){
                            cekuser.push({id: pengirim, denda: 5000})
                            await client.reply(from, "Não seja um estúpido\nBem +5.000", id)
                        } else {
                            cekuser.push({id: pengirim, denda: 0})
                        }
                        db.get('group').find({ id: groupId }).set('members', cekuser).write()
                    }
                }
            } else {
                if(isKasar){
                    db.get('group').push({ id: groupId, members: [{id: pengirim, denda: 5000}] }).write()
                    await client.reply(from, "Não seja um estúpido\nBem +5.000\nTotal : Rp5.000", id)
                } else {
                    db.get('group').push({ id: groupId, members: [{id: pengirim, denda: 0}] }).write()
                }
            }
        }
    } catch (err) {
        console.log(color('[EROR]', 'red'), err)
    }
}
