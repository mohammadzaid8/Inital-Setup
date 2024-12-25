import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req,res)=>{
    const {fullname,email,password,username}=req.body;
     
    if(fullname === ""){
        throw new ApiError(400,"fullname is required")
    }

    if(
        [fullname,email,password,username].some((e)=>e?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

   const existedUser =await User.findOne({ 
        
        $or:[{username},{email}]
    });

    // console.log(existedUser);

    if(existedUser){
        throw new ApiError(409,"User with email or username exist!");
    }

    // console.log(req.files);
    const avatarLocalPath =  req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.file && Array.isArray(req.file.coverImage) && req.file.coverImage.length>0){
        coverImageLocalPath=req.file.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required from form");
    }

    const avatar=await uploadCloudinary(avatarLocalPath);
    
    const coverImage=await uploadCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required for cloud");
    }

    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser){
        throw new ApiError(500,"Something went wrong during Save in DB");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    );
    
}); 

export {registerUser};