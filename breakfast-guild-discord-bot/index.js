const dotenv = require('dotenv');
dotenv.config();

const validator = require("email-validator");
const Discord = require("discord.js");
const fetch = require('node-fetch');
const { prefix } = require('./config.json')
var fs = require('fs');

// Auth0 Global Variables
var tokenGenerationTime;
var managementToken;
var managementTokenExpireTime = 86400; // in seconds


async function defineAuth(){
   // Get current time in SECONDS
    tokenGenerationTime = ((Date.now()) / 1000);
    managementToken = await GetManagementToken();
    console.log(managementToken);
    
    var ManagementClient = require('auth0').ManagementClient;

    var management = new ManagementClient({
        token: managementToken.access_token,
        domain: process.env.AUTH0_DOMAIN
    }); 
}

defineAuth();

const client = new Discord.Client();

client.once("ready", () => {
    console.log("Ready!");
    client.user.setActivity('/table help', { type: "PLAYING" });
});

client.on("message", function(message){
    // Get Formated Time
    let currentTime = new Date();
    currentTime.toDateString();

    if(!message.content.startsWith(prefix)){
        
        if(message.guild){
            let dir = "./logs/"+ message.channel.id;
            
            let log = ("[" + currentTime + "] " + message.author.username + "#" + message.author.discriminator + ": " + message.content + "\n");

            fs.appendFile(`./logs/channels/${message.channel.id}.txt`, log, function(err) {
                if(err) {
                    // failed
                    console.log(err);
                } else {
                    // done
                }
            });
        } else {
            fs.appendFile(`./logs/direct/log.txt`, message.content, function(err) {
                if(err) {
                    // failed
                    console.log(err);
                } else {
                    // done
                }
            });
        }
        return;
    }
    else if (message.author.bot){
        return;
    }    

    // Do Checks
    currentTimeInSeconds = Date.now() / 1000;
    let remainingTokenTime = ((tokenGenerationTime + managementTokenExpireTime - 1000) - (currentTimeInSeconds))
    
    // If token has expired, renew it.
    if (remainingTokenTime < 0) {
        console.log("Token Expired.")
        tokenGenerationTime = ((Date.now()) / 1000);
        managementToken = GetManagementToken(); 
    }

    // Log checks
    console.log("Remaining token time in seconds: " + remainingTokenTime);

    // Log Valid Messages to Console
    let log = ( currentTime + " Parsing valid prefix: '" + message.content + "' from " + message.author.username + "#" + message.author.discriminator + ".");
    console.log(log);

    // Log to Permanent File
    fs.appendFile('./logs/commands/log.txt', log, function(err) {
        if(err) {
            // failed
            console.log(err);
        } else {
            // done
        }
    });

    
    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.trim().split(' ');
    const command = args.shift().toLowerCase();

    if (!message.guild){
        // Direct Messages or Private Group Messages
        message.author.send("Hey, you should talk with me through the server that you are.");


    } else { // Else, if it has a guild, that means it was sent on a server.

    
        if (command === 'test') {
            message.channel.send("<@" + message.author.id + "> \n" +
            "Second line. **Bold text.**");
                        
        } else 
        if (command === 'help') {
            const embed = new Discord.MessageEmbed()
                .setColor('#00ffff')
                .setTitle('Information')
                .setURL("https://breakfast.vercel.app/")
                .setAuthor('Breakfast Table')
                .setDescription('For administrative commands, please call this command on admin channels.')            
                .setTimestamp()
                .setFooter('Breakfast Guild')
                .addFields(
                    { name: 'Register on our Webapp', value: '/table register youruser youremail@mail.com' }
                );
            
            if(message.channel.name === "admin") {
                embed.addField('Get Registered Members', '/table getusers');
                message.channel.send(embed);
            } else {
                message.channel.send(embed);
            }
        } else
        if (command === 'getusers') {
            if(message.channel.name === "admin") {
                management.getUsers()
                .then((result) => {
                    message.reply("There are " + result.length + " registered members.");
                })
                .catch((err) => {
                    console.error(err);
                });
            } else {
                message.reply("This command is exclusive to administrators.");
            }
        } else 
        if (command === 'resetpwd') {
            let currentTime = new Date();
            currentTime.toDateString();
            console.log("Command /resetpwd requested by " + message.author.username + message.author.discriminator + " at " + currentTime);
            
            // Check if the user is already registered - this is a command exclusive to Registered users
            if(message.member.roles.cache.some(r => r.name === "Registered")) {
                message.reply("Feature not implemented yet.");
                message.delete();
            } else {
                message.reply("You are not a Registered user. Please register yourself using `/table register username example@email.com`.\n" + "For more information, please use /table help.")
                message.delete();
            }

        } else
        if (command === 'register') {
            let currentTime = new Date();
            currentTime.toLocaleDateString();
            
            console.log("Command /register requested by " + message.author.username + message.author.discriminator + " at " + currentTime);
            
            
            
            // Check if user is not registered already
            if(!message.member.roles.cache.some(r => r.name === "Registered")) {

                // Validate args
                if(args.length) {
                    let username = args[0].toLowerCase();
                    let email = args[1].toLowerCase();
                    
                    // Validate Username
                    if(username.length >= 3 && username.length <= 15) {

                        // Validate Email
                        if(validator.validate(email)) {

                            console.log('Attempt to register user: ' + username + ' to email: ' + email);
                            
                            var randomString = Math.random().toString(36).slice(-8);
                                                    
                            const body = {
                                "connection": process.env.AUTH0_DB_CONNECTION,
                                "email": email,
                                "username": username,
                                "password": randomString,
                                "email_verified": false,
                                // "picture": message.author.avatarURL()
                                "app_metadata": { 
                                    createdAt: currentTime, 
                                    createdByDiscordUsedId: message.author.id, 
                                    discordUsernameAtCreation: message.author.username + "#" + message.author.discriminator,
                                    discordRank: "meal",
                                },
                            };
                            
                            

                            fetch("https://" + process.env.AUTH0_DOMAIN + "/api/v2/users", {
                                method: "POST",
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managementToken.access_token}` },
                                body: JSON.stringify(body)
                            })
                            .then(
                                (res) => {
                                    if (res.status != 201) {
                                        message.reply("I couldn't register your account. Please talk with one of our administrators. Status Code: **" + res.status + "**");
                                        
                                        let body = res.json().then((d) => console.log(d));

                                        message.delete();
                                    } else if (res.status === 409) {
                                        message.reply("I couldn't register your account. This email or username already exists. \nPlease choose a new one.")

                                        let body = res.json().then((d) => console.log(d));
                                        message.delete();
                                    } else if (res.status === 201 ){    
                                        var role = message.guild.roles.cache.find(role => role.name === "Registered");
                                        message.member.roles.add(role);
                                        message.author.send(
                                            "**Hey <@" + message.author.id + ">**\n" + 
                                            "Your account was succesfully registered at our Webapp.\n" +
                                            "\n" +
                                            "**Email: **" + email + " **Username:** " + username + "\n" +
                                            "\n" + 
                                            "We sent you a verification email. It should take a minute for you to receive it. \n" +
                                            'After your account verification, head to our **Login** page and click on "Forgot Password?" to reset your password.\n' +
                                            "We have set a randomized password so you can change it to whatever you'd like without the need to send it publicily on our discord channels. \n" +
                                            "\n"+
                                            "Follow the instructions on the email that you received. \n" + 
                                            "That's pretty much it. Welcome!"
                                        )
                                        console.log("Status 201: Registered a new user successfully.");
                                        // console.log(res);
                                        message.delete();
                                    }
                                }
                            )
                            .catch(
                                (err) => {
                                    console.error(err.message);
                                }
                            );
                        } else {
                            // Handle Err for Email Format
                            valid = false;
                            DMSendErr(message, 'Incorrect email format.');
                            message.delete();
                        }
                    } else {
                        // Handle Err for Username Length
                        valid = false;
                        DMSendErr(message, 'Username length needs to be between 3 and 15 characters.');
                        message.delete();
                    }
                } else {
                    // Handle Err for Incorrect args length
                    console.log('Args length: '+ args.length);
                    valid = false;
                    DMSendErr(message, 'You should provide your IGN in the following format, e.g.: ' + '"**/table register coffee coffee@gmail.com**".');
                    message.delete();
                }
            } else {
                console.log("Registered user attempted to register another account."); // maybe call a function to FETCH POST to a DB so I can log and check if someone is trying to multi-register
                message.reply("You have already registered an account. If you need help, please contact our staff members.");
                message.delete();
            }
        }
        
    }
});


client.login(process.env.DISCORD_APP_TOKEN);


function DMSendErr(messageHandler, errMsg) {
    messageHandler.author.send('**Hey ' + messageHandler.author.username + '!**');
    messageHandler.author.send('Your command "**' + messageHandler.content + '**" is invalid.');
    messageHandler.author.send(errMsg);

    console.log('User ' + messageHandler.author.username + ' failed due to err: ' + errMsg);
}

async function GetManagementToken() {
    // Grab a token from Management API v2
    var details = {
        grant_type: 'client_credentials',
        client_id: process.env.AUTH0_MTM_CLIENT,
        client_secret: process.env.AUTH0_MTM_SECRET,
        audience: 'https://breakfast.us.auth0.com/api/v2/'
    }

    var formBody = [];
    for (var property in details) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }

    formBody = formBody.join("&");

    let res = await fetch('https://breakfast.us.auth0.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: formBody
    });

    let data = await res.json();

    console.log("fetch done");

    if(res.status === 200) {
        return data;
    }
}