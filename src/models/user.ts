import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from 'bcryptjs'
import Post from "./post";

export interface IUser extends mongoose.Document {
    name : string;
    email: string;
    password: string;
    following: Array<mongoose.Schema.Types.ObjectId>;
    followedBy: Array<mongoose.Schema.Types.ObjectId>;
    generateAuthToken(): Promise<string>;
}

export interface UserModel extends mongoose.Model<IUser> {
    findByCredentials(email: string, password: string) : Promise<IUser>
}

const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema<IUser,UserModel>({
    name:{
        type:String,
        required:true,
        trim:true,
        validate(value: string){
            if(value === null){
                throw new Error('Please provide a value');
            }
        }
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    following: [ { type: Schema.Types.ObjectId, ref: 'User', required: true } ],

    followedBy: [ { type: Schema.Types.ObjectId, ref: 'User', required: true } ]
},
{
    timestamps:{
        createdAt:'created_at',
        updatedAt: false
    }
}
);

userSchema.virtual('posts',{
    ref: 'Post',
    localField: '_id',
    foreignField: 'user'
});

    
userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = await jwt.sign({ _id: user._id.toString() }, process.env.ACCESS_Token_Secret, { expiresIn: '15m' });
    return token;
}

userSchema.statics.findByCredentials = async (email, password) => {

    const user = await User.findOne({ email })
    
    if(!user){
        throw new Error('please provide correct email')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if(!isMatch){
        throw new Error('please provide correct password')
    }

    return user;
}

userSchema.pre('save', async function (next) {
    const user = this
    if(user.isModified('password')){
        user.password = await bcrypt.hash(user.password, 10)
    }

    next()
})
userSchema.post('save', function(error,doc,next){
   
    if (error.name === 'MongoError' && error.code === 11000) {
        //next(new Error('There was a duplicate key error'));
        throw new Error('This Email exists please enter a new email');
      } else {
        next(error);
      }
      
})
userSchema.pre('remove', async function (next) {
    const user = this;

    await Post.deleteMany({ createdBy: user._id });
    const usersFollowingMe = user.followedBy;
    const usersFollowed = user.following;
    
    for await(const userId of usersFollowingMe){
        const tempUser: IUser = await User.findById(userId);
        tempUser.following = tempUser.following.filter(val => val.toString() !== user._id.toString());
        await tempUser.save();
    }

    for await(const userId of usersFollowed){
        const tempUser: IUser = await User.findById(userId);
        tempUser.followedBy = tempUser.followedBy.filter(val => val.toString() !== user._id.toString());
        await tempUser.save();
    }
    /*usersFollowingMe.forEach(async(userId) => {
        const tempUser: IUser = await User.findById(userId);
        tempUser.following = tempUser.following.filter(val => val.toString() !== user._id.toString());
        await tempUser.save();
    })*/

    next();
})

const User = mongoose.model<IUser, UserModel>("User", userSchema);
export default User;
