import React,{useState} from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import io from 'socket.io-client';
//import {useSpring,animated, useTrail} from 'react-spring'
//import {useTrail,animated} from 'react-spring'


class Page extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            username:null,
            roomval:null,
            room:null
        }
        this.roomValueChange = this.roomValueChange.bind(this);
        this.nameValueChange = this.nameValueChange.bind(this);
        this.handleBtn = this.handleBtn.bind(this);
    }
    nameValueChange(e){
        this.setState({username:e.value})
    }
    roomValueChange(e){
        this.setState({roomval:e.value});
    }
    handleBtn(){
        this.setState({room:this.state.roomval});
    }
    createRoom(){
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST",'http://localhost:4000/genRoom');
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                console.log(xhttp.responseText);
                // result = JSON.parse(req.responseText);
                this.setState({roomval:xhttp.responseText});
                this.handleBtn();
            }
        };
        xhttp.send();

    }
    render(){
        var display = null;
        if(this.state.room !== null){
            display = <GamePage room ={this.state.room} uname = {this.state.username}/>
        }else{
            display = <div id="forms">
                        <form>
                            User Name: <input type="text" name="username" onChange={(e)=>this.nameValueChange(e.target)} /><br/>
                            Room ID: <input type="text" name="room" onChange={(e)=>this.roomValueChange(e.target)} /><br/>
                            <button type="button" onClick={()=>this.handleBtn()}>Join</button>
                            <button type="button" onClick={()=>{this.createRoom()}}>Create Room</button>
                        </form>
                    </div>;
        }
        return(
            <div className="page">
                {display}
            </div>
        )
    }
}
class GamePage extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            socket:io('http://localhost:4000/'+this.props.room),
            color:null
        }
        this.setColor = this.setColor.bind(this);
    }
    setColor(clr){
        this.setState({color:clr})
    }
    render(){
        return(
            <div className="GamePage">
                <Header/>
                <Grid socket = {this.state.socket} color = {this.state.color}/>
                <Server roomID = {this.props.room} username = {this.props.uname} socket = {this.state.socket} setclr = {this.setColor}/>
            </div>
        )
    }
}
function Header(props){
    console.log("Header");
    return(
        <div className="header" onClick={() => props.click()}>
            Chain Reaction
        </div>
    )
}
class Server extends React.Component{
    constructor(props){
        super(props);
        this.state ={
            members: new Array(6).fill(null)
        }
    }
    componentDidMount(){
        this.props.socket.send(this.props.username);
        this.props.socket.on("AssignCol",data=>{
            console.log(data);
            this.props.setclr(data);
        })
        this.props.socket.on("MemberList",data =>{
            this.setState({members:data});
            })
    }
    render(){
        console.log(this.props.socket);
        var i =0;
        const memberRen = new Array(6).fill(null);
        this.state.members.forEach(member => {
            if(member != null){
                memberRen[i++] = <div className="server-mem">
                <div className="mem-color" style={{'background':member.color}}>
                    
                </div>
                <div className="mem-name">
                    {member.name}
                </div>
            </div>
            }
        });
        return(
                <div className="server-mems">
                    <div className="roomName">
                        ROOM ID:
                        {this.props.roomID}
                    </div>
                        {memberRen}
                </div>   
        )
    }
}
class Grid extends React.Component{
    constructor(props){
        super(props);
        this.state ={
            board: Array(100).fill(0),
            gameOver:false,
            winner:null,
            ownerBoard: Array(100).fill(null)
        }
        this.chance = this.props.color;
        this.handleClick = this.handleClick.bind(this);
        this.makeMove = this.makeMove.bind(this);
        this.count = -1;
    }
    componentDidMount(){
        this.props.socket.on("GameMove",(data)=>{
            console.log(data);
            this.makeMove(data.x,data.y);
        })
        this.props.socket.on("Chance",(data)=>{
            console.log(data);
            this.chance = data;
        })
        this.props.socket.on("Player Won",(data)=>{
            this.setState({gameOver:true,winner:data})
        })
    }
    handleClick(x,y){
        if(this.chance === this.props.color && !this.state.gameOver){
            this.props.socket.emit("GameMove",{x:x,y:y,clr:this.props.color});
            this.chance = this.props.color;
            this.makeMove(x,y);    
        }
    }
    makeMove(x,y){
        const gridLay = this.state.board.slice();
        const ownergrid = this.state.ownerBoard.slice();
        if(ownergrid[10*x+y] === this.chance || ownergrid[10*x+y] === null){ 
            this.expandReaction(gridLay,x,y,ownergrid);
            if(this.count === 0){
                this.props.socket.emit("GameOver",this.props.color);
                this.setState({board:gridLay, ownerBoard:ownergrid,gameOver:true});
            }else{
                this.setState({board:gridLay, ownerBoard:ownergrid});    
            }
        }


    }
    expandReaction(grid,x,y,ownergrid){
        if(ownergrid[10*x+y] === this.props.color){
            if(this.chance !== this.props.color){
                this.count--;
            }
        }
        if(this.chance === this.props.color){
            if(ownergrid[10*x+y] !== this.props.color){
                if(this.count === -1){
                    this.count = 1;
                }else
                    this.count++;
            }
        }
        ownergrid[10*x+y] = this.chance;
        grid[10*x+y]++;
        let thresh = 4;
        if((x===0&&y===0)||(x===9&&y===9)||(x===0&&y===9)||(x===9&&y===0)){
            thresh = 2;
        }else if(x===0||y===0||x===9||y===9){
            thresh = 3;
        }
        if(grid[10*x+y] === thresh){
            grid[10*x+y]=0;
            ownergrid[10*x+y] = null;
            if(x<9)
            this.expandReaction(grid,x+1,y,ownergrid);
            if(y<9)
            this.expandReaction(grid,x,y+1,ownergrid);
            if(x>0)
            this.expandReaction(grid,x-1,y,ownergrid);
            if(y>0)
            this.expandReaction(grid,x,y-1,ownergrid);
        }
    }
    render(){
        const rows = Array(10).fill(null);
        for (let i = 0; i < 10; i++) {
            rows[i] = <Rows row_num = {i} click = {this.handleClick} board = {this.state.board} ownerBoard = {this.state.ownerBoard} />          
        }
        return(
            <div className="grid">
                <div className="now-play">
                    <Play color = {this.props.color} gameover = {this.state.gameOver} socket ={this.props.socket} winner={this.props.color === this.state.winner ? true : false}/>
                </div>
                {rows}
            </div>
        )
    }
}
function Play(props){
    const [chance,setChance] = useState(null);
    props.socket.on("Chance",(data)=>{
        setChance(data);
    })
    var play;
    if(!props.gameover){
        if(chance === props.color){
            play = "Your Turn";
        }else{
            play = chance+"'s Turn";
        }
    }else{
        if(props.winner){
            play = "You won";
        }else
            play = "You lost";
    }
    return(
        <div className="play">
            {play}
        </div>
    )
}
function Rows(props){
    const col = new Array(10);
    for (let i = 0; i < 10; i++) {  
        col[i] = <Element onclick = {props.click} owner= {props.ownerBoard[10*(props.row_num)+i]} value = {props.board[10*(props.row_num)+(i)]} x = {props.row_num} y ={i} /> 
    }
    return (
        <div className="container">
            <div className="row">
                {col}
            </div>
        </div>
    )
}
class Element extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            owner:null
        }
    }
    render(){
    return(
        <div className="element" style={{'background':this.props.owner}} onClick={() => this.props.onclick(this.props.x,this.props.y,this.props.owner)}>
            {this.props.value}
        </div>
    )
    }
}
ReactDOM.render(
    <Page />,
    document.getElementById('root')
);

