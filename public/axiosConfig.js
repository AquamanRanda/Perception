import axios from 'axios'

let instance = axios.create({ baseURL: "http://0.0.0.0:4000/" });

export default instance;