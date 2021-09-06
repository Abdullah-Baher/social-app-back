import mongoose from "mongoose";
import { IUser } from "./user";
export interface IPost extends mongoose.Document {
    text: string;
    image: object;
    createdBy: IUser['_id'];
    likedBy: Array<mongoose.Schema.Types.ObjectId>;
}
const Schema = mongoose.Schema;
const postSchema = new Schema<IPost>({
    text: {
        type: String,
        trim: true,
        //required: true,
        default:'',
        validate(value: string){
            if(value === null){
                throw new Error('Please provide a body for the post!');
            }
        }
    },
    image: {
        type: {}
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    likedBy: [ { type: Schema.Types.ObjectId, ref: 'User', required: true } ]
},
    { timestamps: true }
);


const Post = mongoose.model<IPost & mongoose.Document>("Post", postSchema);
export default Post;