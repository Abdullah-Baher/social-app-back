import express, { json } from "express";
import { body, validationResult } from "express-validator";
import UsersController from "../controllers/users_controller"
import auth from '../middleware/Auth';


const router = express.Router();

router.post("/", body("email").isEmail(), UsersController.prototype.postUser);

router.post("/login", body("email").isEmail(), UsersController.prototype.loginUser);

router.put("/:userId", body("email").isEmail(), UsersController.prototype.replaceUser);

router.patch("/:userId", body("email").isEmail(), UsersController.prototype.updateUser);

router.patch("/follow/:userToFollowId", auth, UsersController.prototype.updateFollowedUsers);

router.get("/follow", auth, UsersController.prototype.getFollowedUsers);

router.get("/search", auth, UsersController.prototype.getSearchUsers);

router.get("/", UsersController.prototype.getAllUsers);

router.get("/:userId", UsersController.prototype.getUserById);


router.delete("/:userId", UsersController.prototype.deleteUser);


export default router;