import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user=await User.findById(userId);  

        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});

        return{
            accessToken,
            refreshToken
        };

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token");
    }
} 

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

const loginUser = asyncHandler(async (req,res)=>{
    const{username,password,email}=req.body;
    if(!(username || email)){
        throw new ApiError(400,"username or email is required");
    }

    const user=await User.findOne(
        {
            $or:[{username},{email}]
        }
    );

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPasswordValid= await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    const {accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id);

    const loggInUser = await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly: true,
        secure:true
    }

    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    user:loggInUser,accessToken,refreshToken
                },

            )
        )

});

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:undefined}
        },
        {
            new:true
        }
    )

    const options={
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
});

const refreshAccessToken=asyncHandler(async(req,res)=>{
   const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken;

   if(incomingRefreshToken){
    throw new ApiError(401,"unauthorized request");
   }

   try {
    const decodedToken=jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
    )
 
    const user= await User.findById(decodedToken?._id);
 
    if(!user){
     throw new ApiError(401,"Invalid refresh Token");
    }
 
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401,"Refresh Token is expired or used");
    }
 
    const options={
     httpOnly:true,
     secure:true
    }
 
    const{accessToken,newrefreshToken}=await generateAccessAndRefreshToken(user._id);
    
    return res
         .status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refreshToken",newrefreshToken,options)
         .json(
             new ApiResponse(
                 200,
                 {accessToken,refreshToken:newrefreshToken},
                 "Access token refreshed"
             )
         )
   } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token");
   }


});

export {registerUser,loginUser,logoutUser,refreshAccessToken};