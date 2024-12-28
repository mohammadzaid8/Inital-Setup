import {Router} from "express";
import {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,
    getCurrentUser,updatedAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js" ;
import {verifyJWT} from "../middlewares/auth.middleware.js";

const router =Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

//secured route
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/changePassword").post(verifyJWT,changeCurrentPassword);
router.route("/getCurrentUser").get(verifyJWT,getCurrentUser);
router.route("/updateAccountDetails").patch(verifyJWT,updatedAccountDetails);

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/coverImage").post(verifyJWT,upload.single("coverImage"),updateUserCoverImage);

router.route("/c/:username").get(verifyJWT,getUserChannelProfile);
router.route("/watchHistory").get(verifyJWT,getWatchHistory);







export default router;