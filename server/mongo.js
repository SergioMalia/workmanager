import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { initialUsers, getInitialSections, initialMaterials } from './seedData.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB_NAME || 'pruebajoaquin';

const usersCollectionName = process.env.MONGODB_USERS_COLLECTION || 'users';
const projectsCollectionName = process.env.MONGODB_PROJECTS_COLLECTION || 'projects';
const materialsCollectionName = process.env.MONGODB_MATERIALS_COLLECTION || 'materials';
const averiasCollectionName = process.env.MONGODB_AVERIAS_COLLECTION || 'averias';
const obrasCollectionName = process.env.MONGODB_OBRAS_COLLECTION || 'obras';
const tasksCollectionName = process.env.MONGODB_TASKS_COLLECTION || 'tasks';
const timelineCollectionName = process.env.MONGODB_CRONOGRAMA_COLLECTION || 'cronograma';

let client;
let cachedDb;

async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!client) {
    client = new MongoClient(uri);
  }

  await client.connect();
  cachedDb = client.db(dbName);
  return cachedDb;
}

export async function getCollections() {
  const db = await getDb();
  return {
    users: db.collection(usersCollectionName),
    projects: db.collection(projectsCollectionName),
    materials: db.collection(materialsCollectionName),
    averias: db.collection(averiasCollectionName),
    obras: db.collection(obrasCollectionName),
    tasks: db.collection(tasksCollectionName),
    cronograma: db.collection(timelineCollectionName),
  };
}

export async function seedDatabase() {
  const { users, projects, materials, averias, obras, tasks, cronograma } = await getCollections();
  const [userCount, projectCount, materialCount, averiasCount, obrasCount, tasksCount, timelineCount] =
    await Promise.all([
      users.estimatedDocumentCount(),
      projects.estimatedDocumentCount(),
      materials.estimatedDocumentCount(),
      averias.estimatedDocumentCount(),
      obras.estimatedDocumentCount(),
      tasks.estimatedDocumentCount(),
      cronograma.estimatedDocumentCount(),
    ]);

  const { projects: initialProjects, averias: initialAverias, obras: initialObras, tasks: initialTasks, timelineEntries } =
    getInitialSections();

  if (userCount === 0) {
    await users.insertMany(initialUsers.map(user => ({ ...user, _id: user.id })));
  }

  if (projectCount === 0) {
    await projects.insertMany(initialProjects.map(project => ({ ...project, _id: project.id })));
  }

  if (materialCount === 0 && initialMaterials.length > 0) {
    await materials.insertMany(initialMaterials.map(material => ({ ...material, _id: material.id })));
  }

  if (averiasCount === 0 && initialAverias.length > 0) {
    await averias.insertMany(initialAverias.map(project => ({ ...project, _id: project.id })));
  }

  if (obrasCount === 0 && initialObras.length > 0) {
    await obras.insertMany(initialObras.map(project => ({ ...project, _id: project.id })));
  }

  if (tasksCount === 0 && initialTasks.length > 0) {
    await tasks.insertMany(initialTasks.map(task => ({ ...task, _id: task.id })));
  }

  if (timelineCount === 0 && timelineEntries.length > 0) {
    await cronograma.insertMany(timelineEntries.map(entry => ({ ...entry, _id: entry.id })));
  }
}
