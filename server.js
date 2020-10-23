const express = require('express')
const path= require('path')
const log=require('why-is-node-running')
const bodyparser=require('body-parser')
const router=require('./routes/router.js')
const cors=require('cors')
const app=express()
const http=require('http').Server(app)
const io=require('socket.io')(http);
const redis=require('redis');
const instance_check=require('./middleware/if_logged_in')
app.use(cors())
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())
app.use(express.static('views/images'))
app.use(express.static('views/js'))
app.use(express.static('views/css'))
app.use(router);

app.post('/make_room',instance_check.is_in,(req,res)=>{
    let room=null;
    room=require('crypto').randomBytes(8).toString('hex').slice(0,8);
    return res.status(201).send({room_id:room});
});

app.get('/join_room',instance_check.is_in,(req,res)=>{
    console.log("trying to join");
let room= req.query.room_id;
if(room)
{res.cookie('room_id',room,{expires:new Date(Date.now()+3600000)});
res.status(301).redirect('/arena');}
else{
    res.status(301).redirect('/');
}
});
const server=http.listen(3004,()=>{
    console.log("server up on port 3004")
});

let listeners=[];
let room='abc';
let user;
//pub sub;
let pub=redis.createClient();
let sub=redis.createClient();
io.use(async function(socket,next){
    if(instance_check.f(socket.handshake)){
        console.log("here");
        next();
    }
    else {
        console.log("errorshake");
        next();
    }
  
    }).on('connection',(client)=>{    
    client.on('disconnect',()=>{
        
        console.log('closed');
        client.off('message',x);
    });
    console.log("new client connected");

    cookies=client.handshake.headers.cookie.split(';')
    cookies.forEach(element => {
        let a=element.split('=');
        a[0]=a[0].trim();

        if(a[0]=='room_id')
        room=a[1];
        if(a[0]=='user')
        user=a[1];
        
    });
    sub.subscribe(room);
    let key;
    pub.get(room,(err,res)=>{
        if(res)
        console.log(res.substr(0,10))
        key=res;  client.emit('cache',key);
    })
  
    console.log('registered'+room)
    sub.on('message',(channel,message)=>{
        client.emit("data",message);
        console.log('message recieved on redis instance'+message.substr(1,100));
    });
  
    {client.on('message',x);
    
}
client.on('cache',(data)=>{
console.log("recieved cache")
    pub.set(room,data);
})
    
});
function x(message){
    pub.publish(room,message);
}
