var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const path = require("path");
var members = new Array(5).fill(null);

app.use(express.static(path.join(__dirname, "..", "build")));
app.use(express.static("public"));

var room = null;
var cors = require('cors');

app.use(cors({origin: 'http://localhost:3000'}));



function gen_room_name() { 
    var name = Math.random().toString(36).slice(2);
    return name; 
}
var roomId;
app.post('/genRoom',(req,res)=>{
    roomId = gen_room_name();
    room = io.of(roomId);
    res.send(roomId);
    createSocket();
})
function createSocket(){
    var members = new Array(6).fill(null);
    var num_mems = 0;
    var chance;
    var players = new Map();
    const colors = ["red","blue","green","yellow","purple","pink"];    
    console.log(room.name);
room.on('connection',(socket)=>{
    console.log("User Connected");

    socket.on('message', (data) => {
        console.log(data);
        room.to(socket.id).emit("AssignCol",colors[num_mems]);
        members[num_mems] = {id:socket.id,name:data,color:colors[num_mems++]}; 
        room.emit("MemberList",members);
        room.emit("Chance",colors[0]);
        chance = 0;
        players.set(socket.id,colors[num_mems-1]);
        console.log(players);
    });

    socket.on("GameMove",(data)=>{
        console.log(chance);
        socket.broadcast.emit("GameMove",data);
        chance = (chance + 1)%num_mems;
        while(members[chance]===null || !players.get(members[chance].id)){
            chance = (chance + 1)%num_mems;
        }
        room.emit("Chance",players.get(members[chance].id));
    })

    console.log(members);
    socket.on('GameOver',(color)=>{
        console.log(color +" has lost");
        players.delete(socket.id);
        if(players.size === 1){
            players.forEach(function (value,key) {
                room.emit("Player Won",value);
            });
        }
    })
    socket.on('disconnect',()=>{
        for (let i = 0; i < members.length; i++) {
            if(members[i]!=null){
                if(members[i].id === socket.id){
                    members[i] = null;
                }
            }
            
        }
        players.delete(socket.id);
        console.log(socket.id);
        console.log(members);
        room.emit("MemberList",members);
        console.log("Disconnect");
        console.log(players);
    })   
})

}
http.listen(4000,()=>{
    console.log("Listening");
})
