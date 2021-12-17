const express = require('express');
const bodyParser = require('body-parser');
const HttpError=require('./models/HttpError');
const mongoose=require('mongoose');
const postsRoutes = require('./routes/posts-routes');
const usersRoutes = require('./routes/users-routes');
const chatRoomRoutes = require('./routes/chat-room');
const messagesRoutes = require('./routes/messages-routes');
const Video=require('./models/video')
const User = require('./models/user');
const ChatRoom = require('./models/chat-room');
const NearBy =require("./models/nearby")
const cors=require("cors")
require('dotenv/config')
const app= express();

app.use(cors())
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

app.use('/api/posts',postsRoutes);
app.use('/api/users',usersRoutes);
app.use('/api/chat',chatRoomRoutes);
app.use('/api/messages',messagesRoutes);


//video uploaded has been done to server
app.post("/video",(req,res)=>{

    console.log(req.body)


    const VideoData=new Video({
      postedByUrl:req.body.url,
        postedBy:req.body.postedBy,
    })
    console.log(VideoData)
    VideoData.save().then((data)=>{

      if(data)
      {
        res.json({"message":"success"})
      }
      else
      {
        res.json({"message":"ërror"})
      }
    })

      
})

//nearby post
app.post("/nearby",(req,res)=>{
  
  

  const nearByData=new NearBy({
      longi:req.body.longi,
      latti:req.body.latti,
      creator:req.body.creator
  })

  NearBy.find({creator:req.body.creator}).then((data)=>{


    
    if(data.length<1)
    {
      nearByData.save().then((data)=>{

        console.log(data)
      
          res.json({"message":data})
      
      })
    
    }

    else
    {
      res.json({"message":"cannot be insert"})
    }




  })
 })

//nearby
app.get("/nearby",async (req,res)=>{

  const data =await NearBy.find().populate('creator')
 
  res.send({"data":data})
})



//get video
app.get("/video",async (req,res)=>{

  const data =await Video.find({})
  res.send({"data":data})
})


//update friends
app.patch("/updateFriends",(req,res)=>{
   //add in whose who will send friend
  User.findByIdAndUpdate(req.body.addFrndId, 
      {$push:{friends: req.body.frndId}},
          { 
            new:true
          }
      ).then((data)=>{
          User.findByIdAndUpdate(req.body.frndId, 
            {$push:{friends: req.body.addFrndId}},
                { 
                  new:true
                }
            ).then((data)=>{
              console.log(data)
              res.json(data)

       }).catch((err)=>{console.log(err)})
  }).catch((err)=>{console.log(err)})  

})

app.get("/allUser/:id",async (req,res)=>{

  const id=req.params.id;
  const data=await User.findById(id)
  res.json(data)
  


})


app.get("/friends/:id",async (req,res)=>{

  const id=req.params.id;
  const data=await User.findById(id).populate("friends").select("friends")
  res.json(data)
  


})

//unfriend
app.patch("/updateunFriends",(req,res)=>{

  console.log(req.body)
  //add in whose who will send friend
  User.findByIdAndUpdate(req.body.addFrndId, 
      {$pull:{friends: req.body.frndId}},
          { 
            new:true
          }
      ).then((data)=>{
        
         //add in  id where we send friend request  
          User.findByIdAndUpdate(req.body.frndId, 
            {$pull:{friends: req.body.addFrndId}},
                { 
                  new:true
                }
            ).then((data)=>{
              res.json(data)

       })
  })  

})

// handle errors : 404;
app.use((req,res,next)=>{
	const error = new  HttpError('Could not find this route.', 404);
    throw error; 
});





app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});


mongoose.connect("mongodb+srv://mongo_db_user:RAJEEV@cluster0-4o2hk.mongodb.net/social=?retryWrites=true&w=majority",{useUnifiedTopology: true,useNewUrlParser: true,useCreateIndex: true, useFindAndModify: false }).then(()=>{
	const server = app.listen(process.env.PORT || 5000);



  const sock = require('./socket');
  const io = sock.init(server);
  const connectedUsers = {};

 

  io.on('connection',  (socket) =>{
      
    console.log("connected")

    //video call through socket io
    //emit my id
    socket.emit("me",socket.id)

    //listen calluser event
    socket.on("callUser",(data)=>{

      console.log(data)
      io.to(data.userToCall).emit("callUser",{signal:data.signalData,from :data.from,name:data.name})

    })



    //answer the call
    socket.on("answerCall",(data)=>{
      console.log(data)
      io.to(data.to).emit(("callAccepted"),data.signal)
    })

    socket.on("endCall",(calleeId)=>{

      io.to(calleeId).emit("endCall");
    })

      socket.on('action',async (action)=>{
        console.log(action)
        switch(action.type){
        case 'USER_LOGIN':{
          const user = await User.findByIdAndUpdate(
            action.userId,
            { $set: { isOnline: true, socketId: socket.id } },
            { safe: true, upsert: true, new: true,select: '_id'  },
          );
          console.log(user)
         connectedUsers[socket.id]=user._id;
          break;
        }
          case 'JOIN_CHAT_ROOM': {
          socket.join(action.roomId);
          break;
        }
        case 'LEAVE_CHAT_ROOM': {
          socket.leave(action.roomId);
          break;
        }
        case 'SEND_NOTFY':{
           const id= action.notify.receiver;
           const user = await User.findById(id).select('isOnline socketId');
           if(user.isOnline){
                 socket.broadcast.to(user.socketId).emit('action', {
                            type: 'ClIENT_SEND_NOTFY',
                            notify: action.notify,
                            state:action.state,
                 });
           }
           break;
        }
        case 'SEND_MESSAGE':{ 
          console.log("send message")
            let roomClients;
            io.in(action.roomId).clients((err, clients) => {
            
            if (!err) {
              roomClients = clients;
            }
          });
          
            try{
               const room = await ChatRoom.findById(action.roomId).populate('members');
               for(let i =0;i<room.members.length;i++){
                  const memberId = room.members[i];
                  const user = await User.findById(memberId,'-password -about -posts ').populate({path:'chatRooms.data',select:'-members'});
                  if(roomClients.indexOf(user.socketId) > -1){
                    let lastMessage= memberId === action.userId ? "You" : action.username ;
                    lastMessage+=" : "
                    if(action.message.messageType==='text'){
                         lastMessage+=action.message.text
                    }
                    else if(action.message.messageType==='image'){
                         lastMessage+="sent a photo"
                    }
                    else if(action.message.messageType==='file'){
                         lastMessage+="sent an attachment"
                    }
                    await User.updateOne({ _id: user._id, 'chatRooms.data': action.roomId },
                            { $set: { 'chatRooms.$.unReadMessages': 0 , 'chatRooms.$.lastMessage':lastMessage } },
                            { safe: true, upsert: true, new: true })
                      socket.broadcast.to(user.socketId).emit('action', {
                            type: 'ClIENT_SEND_MESSAGE',
                            message: action.message
                          });
                  }
                  if(user.isOnline){
                        io.to(user.socketId).emit('action', {
                            type: 'RENDER_ROOMS'
                          });
                        }
               }
            }catch(err){
              console.log(err);
            }

            break;
        }
        case 'CREATE_CAHT_ROOM':{
          const mem = action.members.map(member=>member.value)       
          for(let i=0;i<mem.length;i++){
            try{
              const user = await User.findById(mem[i]).select('socketId');
              socket.broadcast.to(user.socketId).emit('action',{
                  type:'CREATE_CAHT_ROOM',
                  chatRoom:action.data
              })  
            }catch(err){
              console.log(err);
            }
          }
        }
        break;
        }
      })

      socket.on('disconnect', async ()=>{
        console.log("disconnect")
        console.log(connectedUsers[socket.id])
      const data=  await User.findByIdAndUpdate(
            connectedUsers[socket.id],
            { $set: { isOnline: false, socketId: '' } },
            { safe: true, upsert: true, new: true },
          );
          console.log(data)
      } )
      
  })
}).catch(err=>{
	console.log(err);
})
