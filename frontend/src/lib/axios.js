import axios from "axios";

export const api = axios.create({
    baseURL: "https://05tpsgyjzi.execute-api.ap-southeast-1.amazonaws.com/dev",
});
