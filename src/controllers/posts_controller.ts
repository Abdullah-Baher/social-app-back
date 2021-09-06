import express, { NextFunction } from "express";
import mongoose, { mongo } from "mongoose";
import Post from "../models/post";
import grid from "gridfs-stream";
import User, { IUser } from "../models/user";

const conn = mongoose.connection;
let gfs;

conn.once('open', () => {
  gfs = grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

interface PostInterface {
  postPost(req: express.Request, res: express.Response, next: NextFunction): void;
  updatePost(req: express.Request, res: express.Response, next: NextFunction): void;
  deletePost(req: express.Request, res: express.Response, next: NextFunction): void;
  getPosts(req: express.Request, res: express.Response, next: NextFunction): void;
  getPostImage(req: express.Request, res: express.Response, next: NextFunction): void;
  getPostLikes(req: express.Request, res: express.Response, next: NextFunction): void;
  updateLikesOfPost(req: express.Request, res: express.Response, next: NextFunction): void;
  getFollowedUsersPosts(req: express.Request, res: express.Response, next: NextFunction): void;

}

export default class PostsController implements PostInterface{
  postPost(req: express.Request, res: express.Response, next: NextFunction) {
    const imageUrl = req.protocol + '://' + req.get('host') + "/image/" + req.file.filename;
    console.log(req.file);
    const post = new Post({ text: req.body.text, image: { fileName: req.file.filename, url: imageUrl }, createdBy: req.body.createdBy, likedBy: [] });
    post.save().then(post => res.json(post)).catch(err => next(err));
  }
  
  updatePost(req: express.Request, res: express.Response, next: NextFunction) {
    const updatedText = req.body.text;
  
    if (!updatedText) {
      const error = new Error("No text found to be updated.");
      error.status= 422;
      next(error);
    }
  
    Post.findOneAndUpdate({ _id: req.params.postId }, { text: updatedText })
      .then(stat => {
        res.statusCode = 202;
        res.send({ status: "Accepted" });
      }).catch(err => next(err));
  
  }
  
  deletePost(req: express.Request, res: express.Response, next: NextFunction) {
    Post.findOne({ _id: req.params.postId }).then(post => {
      gfs.remove({ filename: post.image.fileName, root: 'uploads' }, (err, gridStore) => {
        if (err) return next(err);
  
      });
  
  
      Post.deleteOne(post)
        .then(post => res.send(post)).catch(err => next(err));
    });
  
  }
  
  getPosts(req: express.Request, res: express.Response, next: NextFunction) {
    let idFilter = req.query.userId;
    if (idFilter)
      Post.find({ createdBy: req.query.userId }).populate("createdBy").sort({ createdAt: -1 })
        .then(post => res.send(post)).catch(err => next(err));
  
    else
      Post.find().populate("createdBy").sort({ createdAt: -1 })
        .then(posts => res.send(posts)).catch(err => next(err));
  
  }
  
  //image functions
  getPostImage(req: express.Request, res: express.Response, next: NextFunction) {
  
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
  
      if (!file || file.length === 0) {
        const error = new Error("No such a file.");
        error.status = 404;
        next(error);
      }
  
  
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        const error = new Error("File is not an image.");
        error.status = 404;
        next(error);
      }
      
    });
  }
  async getPostLikes(req: express.Request, res: express.Response, next: NextFunction){
    try {
      const postId = req.params.postId;
      const likedUsers = await Post.findById(postId).populate('likedBy');
      res.send(likedUsers);
    } catch(e){
      res.status(500).send({message: e.message});
    }
    
  }

  async updateLikesOfPost(req: express.Request, res: express.Response, next: NextFunction){
    try {
      const postId = req.params.postId;
      const userId = req.user._id;
      const action = req.body.action;
      let post = await Post.findById(postId);
      const user = await User.findById(userId);
      if(!user || !post){
        throw new Error('please send correct userId and postId');
      }
      
      if(action === 'like'){
        post.likedBy.push(userId);
      }

      else if(action === 'dislike'){
        post.likedBy = post.likedBy.filter(val => val.toString() !== userId.toString());
      }

      await post.save();
      res.send(post);
    } catch (e) {
      res.status(500).send({message: e.message})
    }
  }

  async getFollowedUsersPosts(req: express.Request, res: express.Response, next: NextFunction){
    try {
      const userId = req.params.userId;
      const user:IUser = await User.findById(userId);
      
      if(!user){
        throw new Error('please provide correct userId');
      }

      const followedUsers = user.following;
      let posts = await Post.find({createdBy: userId}).populate("createdBy").sort({ createdAt: -1 });

      /*followedUsers.forEach(async(val) => {
        const userposts = await Post.find({createdBy: val}).populate("createdBy").sort({ createdAt: -1 });
        posts = posts.concat(posts,userposts);
      });*/

      for await (const val of followedUsers){
        const userposts = await Post.find({createdBy: val}).populate("createdBy").sort({ createdAt: -1 });
        posts = posts.concat(userposts);
      }
      
      res.send(posts);

    } catch (e) {
      res.status(500).send({message: e.message});
    }
  }
} 
//export default { postPost, updatePost, deletePost, getPosts, getPostImage };