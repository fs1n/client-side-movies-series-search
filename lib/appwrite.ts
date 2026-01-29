import { Client, Account, Databases } from "appwrite";
import { config } from "./config";

const client = new Client()
    .setEndpoint(config.appwrite.endpoint)
    .setProject(config.appwrite.projectId);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };