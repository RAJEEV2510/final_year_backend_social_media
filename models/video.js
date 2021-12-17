const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema =  Schema({
	postedByUrl:{
		type:String,
        require:true,
	},
    postedBy:{
        type:String,
        require:true
    },
    likes:[{type: mongoose.Types.ObjectId}],
    comments:[{type:mongoose.Types.ObjectId}]
	
},{
	timestamps:true
})
module.exports = mongoose.model("Video",videoSchema);