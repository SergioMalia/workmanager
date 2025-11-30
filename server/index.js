import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { getCollections, seedDatabase } from './mongo.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.API_PORT) || 4000;
const API_PREFIX = '/api';

app.use(cors());
app.use(express.json());

const sanitizeDoc = (doc) => {
  if (!doc) return null;
  const { _id, password, ...rest } = doc;
  return rest;
};

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const normalizeProjectType = (type = 'Avería') =>
  type === 'Obra' ? 'Obra' : 'Avería';

const upsertProjectSection = async (project, collections) => {
  const normalized = { ...project, type: normalizeProjectType(project.type) };
  const target =
    normalized.type === 'Obra' ? collections.obras : collections.averias;
  const opposite =
    normalized.type === 'Obra' ? collections.averias : collections.obras;

  await target.updateOne(
    { id: normalized.id },
    {
      $set: normalized,
      $setOnInsert: { _id: normalized.id },
    },
    { upsert: true }
  );
  await opposite.deleteOne({ id: normalized.id });
};

const removeProjectFromSections = async (project, collections) => {
  await collections.averias.deleteOne({ id: project.id });
  await collections.obras.deleteOne({ id: project.id });
};

const upsertTaskRecord = async (task, collections) => {
  const normalizedTask = { ...task, projectId: task.projectId };
  await collections.tasks.updateOne(
    { id: normalizedTask.id },
    {
      $set: normalizedTask,
      $setOnInsert: { _id: normalizedTask.id },
    },
    { upsert: true }
  );

  const entry = {
    id: `timeline-${normalizedTask.id}`,
    taskId: normalizedTask.id,
    projectId: normalizedTask.projectId,
    title: normalizedTask.name,
    startDate: normalizedTask.startDate,
    endDate: normalizedTask.endDate,
  };

  await collections.cronograma.updateOne(
    { taskId: normalizedTask.id },
    {
      $set: entry,
      $setOnInsert: { _id: entry.id },
    },
    { upsert: true }
  );
};

const removeTaskRecord = async (taskId, collections) => {
  await collections.tasks.deleteOne({ id: taskId });
  await collections.cronograma.deleteOne({ taskId });
};

const createProjectRecord = async (payload, collections) => {
  const project = {
    ...payload,
    id: payload.id || randomUUID(),
    tasks: payload.tasks || [],
  };
  project.type = normalizeProjectType(project.type);

  await collections.projects.insertOne({ ...project, _id: project.id });
  await upsertProjectSection(project, collections);

  if (project.tasks.length > 0) {
    await Promise.all(
      project.tasks.map((task) =>
        upsertTaskRecord(
          { ...task, id: task.id || randomUUID(), projectId: project.id },
          collections
        )
      )
    );
  }

  return project;
};

const updateProjectRecord = async (projectId, payload, collections) => {
  const update = { ...payload };
  if (update.type) {
    update.type = normalizeProjectType(update.type);
  }
  const result = await collections.projects.findOneAndUpdate(
    { id: projectId },
    { $set: update },
    { returnDocument: 'after' }
  );

  if (result.value) {
    await upsertProjectSection(result.value, collections);
  }

  return result.value;
};

const deleteProjectRecord = async (projectId, collections) => {
  const project = await collections.projects.findOne({ id: projectId });
  if (!project) return null;

  await collections.projects.deleteOne({ id: projectId });
  await removeProjectFromSections(project, collections);
  await collections.tasks.deleteMany({ projectId });
  await collections.cronograma.deleteMany({ projectId });
  return project;
};

const addTaskToProject = async (projectId, taskPayload, collections) => {
  const task = {
    ...taskPayload,
    id: taskPayload.id || randomUUID(),
    projectId,
  };
  const result = await collections.projects.findOneAndUpdate(
    { id: projectId },
    { $push: { tasks: task } },
    { returnDocument: 'after' }
  );

  if (!result.value) return null;

  await upsertTaskRecord(task, collections);
  await upsertProjectSection(result.value, collections);
  return { project: result.value, task };
};

const updateTaskInProject = async (
  projectId,
  taskId,
  updatePayload,
  collections
) => {
  const task = {
    ...updatePayload,
    id: taskId,
    projectId,
  };

  const result = await collections.projects.findOneAndUpdate(
    { id: projectId },
    { $set: { 'tasks.$[task]': task } },
    { arrayFilters: [{ 'task.id': taskId }], returnDocument: 'after' }
  );

  if (!result.value) return null;

  await upsertTaskRecord(task, collections);
  await upsertProjectSection(result.value, collections);
  return { project: result.value, task };
};

const removeTaskFromProject = async (projectId, taskId, collections) => {
  const result = await collections.projects.findOneAndUpdate(
    { id: projectId },
    { $pull: { tasks: { id: taskId } } },
    { returnDocument: 'after' }
  );

  if (!result.value) return null;

  await removeTaskRecord(taskId, collections);
  await upsertProjectSection(result.value, collections);
  return { project: result.value, taskId };
};

app.get(
  `${API_PREFIX}/state`,
  asyncHandler(async (_req, res) => {
    const collections = await getCollections();
    const [userDocs, projectDocs, materialDocs, averiaDocs, obraDocs, taskDocs, timelineDocs] =
      await Promise.all([
        collections.users.find().toArray(),
        collections.projects.find().toArray(),
        collections.materials.find().toArray(),
        collections.averias.find().toArray(),
        collections.obras.find().toArray(),
        collections.tasks.find().toArray(),
        collections.cronograma.find().toArray(),
      ]);

    res.json({
      users: userDocs.map(sanitizeDoc),
      projects: projectDocs.map(sanitizeDoc),
      materials: materialDocs.map(sanitizeDoc),
      averias: averiaDocs.map(sanitizeDoc),
      obras: obraDocs.map(sanitizeDoc),
      tasks: taskDocs.map(sanitizeDoc),
      cronograma: timelineDocs.map(sanitizeDoc),
    });
  })
);

app.post(
  `${API_PREFIX}/login`,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'El usuario es obligatorio.' });
    }

    const { users } = await getCollections();
    const user = await users.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales no válidas.' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ message: 'Credenciales no válidas.' });
    }

    res.json(sanitizeDoc(user));
  })
);

app.post(
  `${API_PREFIX}/users`,
  asyncHandler(async (req, res) => {
    const { users } = await getCollections();
    const data = req.body || {};
    const user = {
      ...data,
      id: data.id || randomUUID(),
    };

    await users.insertOne({ ...user, _id: user.id });
    res.status(201).json(sanitizeDoc(user));
  })
);

app.delete(
  `${API_PREFIX}/users/:id`,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { users } = await getCollections();
    await users.deleteOne({ id });
    res.status(204).end();
  })
);

app.post(
  `${API_PREFIX}/projects`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const project = await createProjectRecord(req.body || {}, collections);
    res.status(201).json(sanitizeDoc(project));
  })
);

app.put(
  `${API_PREFIX}/projects/:id`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const updated = await updateProjectRecord(req.params.id, req.body || {}, collections);

    if (!updated) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }

    res.json(sanitizeDoc(updated));
  })
);

app.delete(
  `${API_PREFIX}/projects/:id`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const removed = await deleteProjectRecord(req.params.id, collections);

    if (!removed) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }

    res.status(204).end();
  })
);

app.post(
  `${API_PREFIX}/projects/:id/tasks`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const result = await addTaskToProject(req.params.id, req.body || {}, collections);

    if (!result) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }

    res.status(201).json(sanitizeDoc(result.project));
  })
);

app.put(
  `${API_PREFIX}/projects/:projectId/tasks/:taskId`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const result = await updateTaskInProject(
      req.params.projectId,
      req.params.taskId,
      req.body || {},
      collections
    );

    if (!result) {
      return res
        .status(404)
        .json({ message: 'Proyecto o tarea no encontrados.' });
    }

    res.json(sanitizeDoc(result.project));
  })
);

app.delete(
  `${API_PREFIX}/projects/:projectId/tasks/:taskId`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const result = await removeTaskFromProject(
      req.params.projectId,
      req.params.taskId,
      collections
    );

    if (!result) {
      return res
        .status(404)
        .json({ message: 'Proyecto o tarea no encontrados.' });
    }

    res.json(sanitizeDoc(result.project));
  })
);

app.get(
  `${API_PREFIX}/tasks`,
  asyncHandler(async (_req, res) => {
    const { tasks } = await getCollections();
    const docs = await tasks.find().toArray();
    res.json(docs.map(sanitizeDoc));
  })
);

app.post(
  `${API_PREFIX}/tasks`,
  asyncHandler(async (req, res) => {
    const { projectId } = req.body || {};
    if (!projectId) {
      return res.status(400).json({ message: 'projectId es obligatorio' });
    }
    const collections = await getCollections();
    const result = await addTaskToProject(projectId, req.body || {}, collections);

    if (!result) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }

    res.status(201).json(sanitizeDoc(result.task));
  })
);

app.put(
  `${API_PREFIX}/tasks/:taskId`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const existing = await collections.tasks.findOne({ id: req.params.taskId });
    const projectId = req.body?.projectId || existing?.projectId;

    if (!projectId) {
      return res.status(400).json({ message: 'projectId es obligatorio' });
    }

    const result = await updateTaskInProject(
      projectId,
      req.params.taskId,
      req.body || {},
      collections
    );

    if (!result) {
      return res
        .status(404)
        .json({ message: 'Proyecto o tarea no encontrados.' });
    }

    res.json(sanitizeDoc(result.task));
  })
);

app.delete(
  `${API_PREFIX}/tasks/:taskId`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const existing = await collections.tasks.findOne({ id: req.params.taskId });
    if (!existing) {
      return res.status(404).json({ message: 'Tarea no encontrada.' });
    }

    await removeTaskFromProject(existing.projectId, req.params.taskId, collections);
    res.status(204).end();
  })
);

app.get(
  `${API_PREFIX}/averias`,
  asyncHandler(async (_req, res) => {
    const { averias } = await getCollections();
    const docs = await averias.find().toArray();
    res.json(docs.map(sanitizeDoc));
  })
);

app.post(
  `${API_PREFIX}/averias`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const project = await createProjectRecord(
      { ...req.body, type: 'Avería' },
      collections
    );
    res.status(201).json(sanitizeDoc(project));
  })
);

app.put(
  `${API_PREFIX}/averias/:id`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const updated = await updateProjectRecord(
      req.params.id,
      { ...req.body, type: 'Avería' },
      collections
    );

    if (!updated) {
      return res.status(404).json({ message: 'Avería no encontrada.' });
    }

    res.json(sanitizeDoc(updated));
  })
);

app.delete(
  `${API_PREFIX}/averias/:id`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const removed = await deleteProjectRecord(req.params.id, collections);
    if (!removed) {
      return res.status(404).json({ message: 'Avería no encontrada.' });
    }
    res.status(204).end();
  })
);

app.get(
  `${API_PREFIX}/obras`,
  asyncHandler(async (_req, res) => {
    const { obras } = await getCollections();
    const docs = await obras.find().toArray();
    res.json(docs.map(sanitizeDoc));
  })
);

app.post(
  `${API_PREFIX}/obras`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const project = await createProjectRecord(
      { ...req.body, type: 'Obra' },
      collections
    );
    res.status(201).json(sanitizeDoc(project));
  })
);

app.put(
  `${API_PREFIX}/obras/:id`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const updated = await updateProjectRecord(
      req.params.id,
      { ...req.body, type: 'Obra' },
      collections
    );

    if (!updated) {
      return res.status(404).json({ message: 'Obra no encontrada.' });
    }

    res.json(sanitizeDoc(updated));
  })
);

app.delete(
  `${API_PREFIX}/obras/:id`,
  asyncHandler(async (req, res) => {
    const collections = await getCollections();
    const removed = await deleteProjectRecord(req.params.id, collections);
    if (!removed) {
      return res.status(404).json({ message: 'Obra no encontrada.' });
    }
    res.status(204).end();
  })
);

app.get(
  `${API_PREFIX}/cronograma`,
  asyncHandler(async (_req, res) => {
    const { cronograma } = await getCollections();
    const docs = await cronograma.find().toArray();
    res.json(docs.map(sanitizeDoc));
  })
);

app.post(
  `${API_PREFIX}/cronograma`,
  asyncHandler(async (req, res) => {
    const { cronograma } = await getCollections();
    const data = {
      ...req.body,
      id: req.body?.id || randomUUID(),
    };
    await cronograma.insertOne({ ...data, _id: data.id });
    res.status(201).json(sanitizeDoc(data));
  })
);

app.put(
  `${API_PREFIX}/cronograma/:id`,
  asyncHandler(async (req, res) => {
    const { cronograma } = await getCollections();
    const result = await cronograma.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'Entrada no encontrada.' });
    }

    res.json(sanitizeDoc(result.value));
  })
);

app.delete(
  `${API_PREFIX}/cronograma/:id`,
  asyncHandler(async (req, res) => {
    const { cronograma } = await getCollections();
    await cronograma.deleteOne({ id: req.params.id });
    res.status(204).end();
  })
);

app.post(
  `${API_PREFIX}/materials`,
  asyncHandler(async (req, res) => {
    const { materials } = await getCollections();
    const material = {
      ...req.body,
      id: req.body?.id || randomUUID(),
    };

    await materials.insertOne({ ...material, _id: material.id });
    res.status(201).json(sanitizeDoc(material));
  })
);

app.put(
  `${API_PREFIX}/materials/:id`,
  asyncHandler(async (req, res) => {
    const { materials } = await getCollections();

    const result = await materials.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'Solicitud no encontrada.' });
    }

    res.json(sanitizeDoc(result.value));
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(500)
    .json({ message: 'Ocurrió un error inesperado. Revisa el servidor.' });
});

const start = async () => {
  try {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`API lista en http://localhost:${PORT}${API_PREFIX}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

start();
