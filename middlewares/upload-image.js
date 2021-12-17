const cloudinaryStorage = require("multer-storage-cloudinary");
const multer = require('multer');
const cloudinary = require("cloudinary");
require("dotenv").config();

cloudinary.config({
cloud_name:'rajeev',
api_key: `589216389465381`,
api_secret: `K1kERhciHVVTNyC_i5GULfEITAg`
});


const cloudStorage = cloudinaryStorage({
cloudinary: cloudinary,
folder: (req,file,cb)=>{
	const dir = req.body.creator ? "posts" : "profile pictures";
	cb(null,dir)
},
allowedFormats: ["jpg","png","jpeg","pdf","svg"],
transformation:(req,file,cb)=>{
  
  if(file.resource_type==="row")cb(null,null)
  else {	
  const tans = !req.body.width ? [{width:600, gravity: "faces", crop: "fill"}] : [{x: parseInt(req.body.x), y: parseInt(req.body.y), width: parseInt(req.body.width),  crop: "crop"}];
  cb(null,tans); 
    } 
 }
});
  
module.exports=multer({storage: cloudStorage});