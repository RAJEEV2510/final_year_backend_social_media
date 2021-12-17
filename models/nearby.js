const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const nearSchema =  Schema({
	longi:{
		type:Number,

    	},
    latti:{
        type:Number,
        
    
    },
    creator:{type:mongoose.Types.ObjectId,ref:"User",unique:true}
	
},{
	timestamps:true
})
const nearBy=mongoose.model("Near",nearSchema);
nearBy.createIndexes()
module.exports = nearBy