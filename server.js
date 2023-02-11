import express from 'express'
import cors from 'cors'
import axios from 'axios'
import redis from 'redis'

const PORT = 3000
const DEFAULT_EXPIRE = 3600
const app = express()

let redisClient;

(async () => {
    redisClient = redis.createClient(6379, '127.0.0.1');

    redisClient.on("error", (error) => console.error(`Error : ${error}`));

    await redisClient.connect();
})();

app.use(cors())
app.use(express.urlencoded({ extended: true }))

app.get('/', async (req, res, next) => {
    res.status(200).json({
        code: 200,
        status: 'OK',
        data: {
            message: 'server running'
        }
    })
})

app.get('/photos', async (req, res, next) => {
    let id = req.query.albumId
    try {
        let photos = await redisClient.get(`photos?albumId=${id}`)
        if (photos) {
            return res.json({
                cache: true,
                data: JSON.parse(photos)
            })
        }
        if (!photos) {
            const { data } = await axios.get('https://jsonplaceholder.typicode.com/photos', { params: { albumId: id } })
            redisClient.setEx(`photos?albumId=${id}`, DEFAULT_EXPIRE, JSON.stringify(data))
            return res.json({
                cache: false,
                data: data
            })
        }
    } catch (error) {
        next(error)
    }
})

app.get('/photos/:id', async (req, res, next) => {
    let id = req.params.id
    try {
        let photo = await redisClient.get(`photos:${id}`)
        if (photo) {
            return res.json({
                cache: true,
                data: JSON.parse(photo)
            })
        }
        if (!photo) {
            const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${id}`)
            redisClient.setEx(`photos:${id}`, DEFAULT_EXPIRE, JSON.stringify(data))
            return res.json({
                cache: false,
                data: data
            })
        }
    } catch (error) {
        next(error)
    }
})

app.use('*', (req, res, next) => {
    res.status(404).json({
        code: 404,
        status: 'NOT_FOUND',
        errors: {
            page: 'page not found'
        }
    })
})

app.use((err, req, res, next) => {
    console.error(err.message)
    res.status(500).json({
        code: 500,
        status: 'SERVER_ERROR'
    })
})

app.listen(PORT, () => console.log(`server running on ${PORT}`))