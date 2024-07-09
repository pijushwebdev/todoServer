import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'


const app = express();
const port = process.env.PORT || 5000;
dotenv.config();

app.use(express.json());
app.use(cors());

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xqure4g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb+srv://todoApp:PIJUSH01@cluster0.xqure4g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const taskCollections = client.db('TodoApp').collection('tasks');

        app.get('/tasks', async (req: Request, res: Response) => {
            let query: any = {};
            if (req.query.priorityIndex) {
                query.priorityIndex = req.query.priorityIndex
            }
            const allData = await taskCollections.find(query).toArray();
            // result.sort((a, b) => a.originalIndex - b.originalIndex);
            let completeTasks:any[] = [];
            let incompleteTasks:any[] = [];
            allData.map(task => {
                if(task.isCompleted){
                    completeTasks.push(task)
                }else{
                    incompleteTasks.push(task)
                }
            })
            const result = [...incompleteTasks, ...completeTasks]
            res.send(result);
        })

        // find single task
        app.get('/single_task/:id', async (req: Request, res: Response) => {
            const id = req.params.id;
            const result = await taskCollections.findOne({ id });
            res.send(result);
        })

        // add task
        async function generateUniqueId() {
            const generateId = () => Math.random().toString(32).slice(2);
            let idExist;
            let uniqueId;

            do {
                uniqueId = generateId();
                idExist = await taskCollections.findOne({ id: uniqueId });
            } while (idExist);

            return uniqueId;
        }


        app.post('/add_task', async (req: Request, res: Response) => {
            const { title, description, priorityIndex } = req.body;

            const isCompleted = false;
            const id = await generateUniqueId();
            const data = await taskCollections.find().toArray();

            // function generateIndex() {
            //     let originalIndex = 0;
            //     if(data.length > 0){
            //         data?.sort((a, b) => a.originalIndex - b.originalIndex);
            //         const lastElem = data.pop();
            //         originalIndex = lastElem!.originalIndex + 1;
            //         return originalIndex;
            //     }
            //     return originalIndex;
            // }
            // const originalIndex = generateIndex(); 

            //optimized code
            const lastTask = await taskCollections.find().sort({ originalIndex: -1 }).limit(1).next();
            const originalIndex = lastTask ? lastTask.originalIndex + 1 : 0;

            const newTask = { title, description, priorityIndex, id, isCompleted, originalIndex };
            const result = await taskCollections.insertOne(newTask);

            res.send(result)
        })

        app.patch('/taskCompletion/:id', async (req, res) => {
            const id = req.params.id;

            const task = await taskCollections.findOne({ id });

            if (task) {
                task.isCompleted = !task.isCompleted;
                const result = await taskCollections.updateOne({ id }, { $set: { isCompleted: task.isCompleted } });
                if (result.modifiedCount === 1) {          
                    res.send(result);
                }else{
                    res.send('Something went wrong');
                }
            }

        })

        app.delete('/delete_task/:id', async (req: Request, res: Response) => {
            const id = req.params.id;
            const result = await taskCollections.deleteOne({ id });
            res.send(result);
        })

        app.delete('/delete_selected', async (req: Request, res: Response) => {
            const { ids } = req.body;

            if (!Array.isArray(ids)) {
                res.send('Nothing is selected')
            }

            // if it was _id then....
            // const objectIds = ids.map((id:string) => new ObjectId(id) );

            const result = await taskCollections.deleteMany({ id: { $in: ids } });

            res.send(result);
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected");


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Todo Home')
})


app.listen(port, () => {
    console.log("App is listening on port: ", port);
})