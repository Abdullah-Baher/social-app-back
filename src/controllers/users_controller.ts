import express, { NextFunction } from "express";
import { body, validationResult } from "express-validator";
import validator from 'validator';
import User from "../models/user";

interface UserInterface {
    postUser(req: express.Request, res: express.Response, next: NextFunction)    : void;
    loginUser(req: express.Request, res: express.Response, next: NextFunction)   : void;
    replaceUser(req: express.Request, res: express.Response, next: NextFunction) : void;
    updateUser(req: express.Request, res: express.Response, next: NextFunction)  : void;
    getAllUsers(req: express.Request, res: express.Response, next: NextFunction) : void;
    getUserById(req: express.Request, res: express.Response, next: NextFunction) : void;
    deleteUser(req: express.Request, res: express.Response, next: NextFunction)  : void;
    updateFollowedUsers(req: express.Request, res: express.Response, next: NextFunction) : void;
    getFollowedUsers(req: express.Request, res: express.Response, next: NextFunction) : void;
    getSearchUsers(req: express.Request, res: express.Response, next: NextFunction) : void;

}
//validations
function validateEmail(req: express.Request, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error("Email is not valid, Please enter a valid one.");
        error.status = 422;
        throw error;
        //next(error);
    }
}

function validateIncompleteData(req: express.Request, next: NextFunction) {
    if(!req.body.email) {
        const error = new Error("Incomplete data, Please provide an email");
        error.status = 422;
        throw error;
    }
    
    if (!req.body.name && req.body.email) {
        const error = new Error("Incomplete data, Please check again.");
        error.status = 422;
        throw error;
        //next(error)
    }

    if(!req.body.password){
        const error = new Error("Please provide a password");
        error.status = 422;
        throw error;
        //next(error)
    }
}

function validatePassword(req: express.Request, next: NextFunction){
   
    if(!validator.isStrongPassword(req.body.password,
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })){
        const error = new Error("Please provide strong password");
        error.status = 422;
        throw error;
    }
}

function validateIncompleteLoginData(req: express.Request, next: NextFunction){
    if(!req.body.email || !req.body.password){
        const error =  new Error('Please provide an email and password');
        error.status = 422;
        throw error;
    }
}
//endpoints
export default class UsersController implements UserInterface {
    
    async postUser(req: express.Request, res: express.Response, next: NextFunction) {
        try {
            validateIncompleteData(req, next);
            validateEmail(req, next);
            validatePassword(req, next);
            console.log(res.statusCode)
    
            const user = new User({ ...req.body, following: [], followedBy: [] });
            const token = await user.generateAuthToken();
            await user.save()
            res.status(201).send({user, token})
        } catch (err){
            res.send({ message: err.message })
        }
    }
    
    async loginUser(req: express.Request, res: express.Response, next: NextFunction) {
        try {
            validateIncompleteLoginData(req,next);
            const user = await User.findByCredentials(req.body.email, req.body.password)
            const token = await user.generateAuthToken();
            
            res.send({ user , token })
        } catch(err) {
            //next(err)
            res.send({message: err.message});
        }
    }

    replaceUser(req: express.Request, res: express.Response, next: NextFunction) {
        validateIncompleteData(req, next);
        validateEmail(req, next);
        validatePassword(req, next);
    
        User.replaceOne({ _id: req.params.userId }, req.body)
            .then(stat => {
                res.statusCode = 202;
                res.send({ status: "Accepted" });
            }).catch(err => next(err));
    
    }
    
    updateUser(req: express.Request, res: express.Response, next: NextFunction) {
        if (req.body.email)
            validateEmail(req, next);
    
        User.updateOne({ _id: req.params.userId }, req.body)
            .then(stat => {
                res.statusCode = 202;
                res.send({ status: "Accepted" });
            }).catch(err => next(err));
    }
    
    getAllUsers(req: express.Request, res: express.Response, next: NextFunction) {
        User.find().sort({ name: 1 }).
            then(users => {
                if (users)
                    res.send(users);
                else {
                    const error = new Error("No users found.");
                    error.status = 404;
                    next(error);
                }
            }).catch(err => next(err));
    }
    
    getUserById(req: express.Request, res: express.Response, next: NextFunction) {
        User.findById(req.params.userId).
            then(user => {
                if (user)
                    res.send(user);
                else {
                    const error = new Error("User not found.");
                    error.status = 404;
                    next(error);
                }
            }).catch(err => next(err));
    }
    
    async deleteUser(req: express.Request, res: express.Response, next: NextFunction) {
        try {
            const user = await User.findById(req.params.userId);
            await user.remove();
            res.send({ message: 'User deleted successfully' });
        } catch (e) {
            res.status(500).send({ message: e.message });
        }
        /*User.findOneAndDelete({ _id: req.params.userId }).
        then(user => res.send(user)).catch(err => next(err));*/
    }

    async updateFollowedUsers(req: express.Request, res: express.Response, next: NextFunction) {
        try {
            const userToFollowId = req.params.userToFollowId;
            const action = req.body.action;
            const userToFollow = await User.findById(userToFollowId);
            
            if(req.user._id.toString() === userToFollowId.toString()){
                throw new Error('you can not follow yourself');
            } 

            if(!userToFollow){
                throw new Error('please provide a correct userId');
            }

            if(action === 'follow'){
                req.user.following.push(userToFollowId);
                userToFollow.followedBy.push(req.user._id);
            }

            else if(action === 'unfollow'){
                req.user.following = req.user.following.filter(val => val.toString() !== userToFollowId.toString());
                userToFollow.followedBy = userToFollow.followedBy.filter(val => val.toString() !== req.user._id.toString());
            }
            
            await userToFollow.save();
            await req.user.save();
            res.send(req.user);
        } catch (e) {
            res.status(500).send({message: e.message});
        }

    }

    async getFollowedUsers(req: express.Request, res: express.Response, next: NextFunction){
        try {
            const users = await User.findById(req.user._id).populate('following');
            res.send(users.following);
        } catch (e) {
            res.status(500).send({message: e.message});
        }
    }

    async getSearchUsers(req: express.Request, res: express.Response, next: NextFunction){
        try {
        
            const partOfName = req.query.name || '';
            const users = await User.find({ name: { $regex: partOfName.toString(), $options: 'i' } }).limit(10);
            res.send(users);
        } catch (e) {
            res.status(500).send({message: e.message});
        }
    }
}
/**/

//export default { postUser, replaceUser, updateUser, getAllUsers, getUserById, deleteUser, loginUser };