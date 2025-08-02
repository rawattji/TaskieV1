import { AnyTask, CreateTaskDto, UpdateTaskDto, TaskFilter, TaskStats, IInitiative, IEpic, IStory, ITask
} from '../../types/task.types';
import { Logger } from '../../utils/logger';
import { ValidationError } from '../../utils/errors';
import { InitiativeRepository } from '../../models/repositories/InitiativeRepository';
import { EpicRepository } from '../../models/repositories/EpicRepository';
import { StoryRepository } from '../../models/repositories/StoryRepository';
import { TaskRepository } from '../../models/repositories/TaskRepository';
import { WorkspaceRepository } from '../../models/repositories/WorkspaceRepository';

export class TaskService {
  private initiativeRepository: InitiativeRepository;
  private epicRepository: EpicRepository;
  private storyRepository: StoryRepository;
  private taskRepository: TaskRepository;
  private workspaceRepository: WorkspaceRepository;
  private logger: Logger;

 constructor(
  initiativeRepository: InitiativeRepository,
  epicRepository: EpicRepository,
  storyRepository: StoryRepository,
  taskRepository: TaskRepository,
  workspaceRepository: WorkspaceRepository,
  logger: Logger
) {
  this.initiativeRepository = initiativeRepository;
  this.epicRepository = epicRepository;
  this.storyRepository = storyRepository;
  this.taskRepository = taskRepository;
  this.workspaceRepository = workspaceRepository;
  this.logger = logger;
}

  /**
   * Create a new task (Initiative, Epic, Story, or Task)
   */
  async createTask(taskData: CreateTaskDto, creator_id: string): Promise<AnyTask> {
    const { type, initiative_id, epic_id, story_id, ...common_data } = taskData;
    
    // Validate hierarchy constraints
    this.validateTaskHierarchy(type, initiative_id, epic_id, story_id);
    
    const created_ata = {
      ...common_data,
      creator_id
    };

    switch (type) {
      case 'INITIATIVE':
        return this.initiativeRepository.create({
          ...created_ata,
          type: 'INITIATIVE',
          status: 'CREATED'
        });

      case 'EPIC':
        if (!initiative_id) {
          throw new ValidationError('Epic must be linked to an initiative');
        }
        return this.epicRepository.create({
          ...created_ata,
          initiative_id,
          type: 'EPIC',
          status: 'CREATED'
        });

      case 'STORY':
        if (!epic_id) {
          throw new ValidationError('Story must be linked to an epic');
        }
        return this.storyRepository.create({
          ...created_ata,
          epic_id,
          type: 'STORY',
          status: 'CREATED'
        });

      case 'TASK':
        if (!story_id) {
          throw new ValidationError('Task must be linked to a story');
        }
        return this.taskRepository.create({
          ...created_ata,
          story_id,
          type: 'TASK',
          status: 'CREATED'
        });

      default:
        throw new ValidationError('Invalid task type');
    }
  }

  /**
   * Update a task
   */
  async updateTask(id: string, type: string, updates: UpdateTaskDto): Promise<AnyTask | null> {
    switch (type) {
      case 'INITIATIVE':
        return this.initiativeRepository.update(id, updates);
      case 'EPIC':
        return this.epicRepository.update(id, updates);
      case 'STORY':
        return this.storyRepository.update(id, updates);
      case 'TASK':
        return this.taskRepository.update(id, updates);
      default:
        throw new ValidationError('Invalid task type');
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string, type: string): Promise<boolean> {
    switch (type) {
      case 'INITIATIVE':
        // Check if there are any epics linked to this initiative
        const epics = await this.epicRepository.findByInitiative(id);
        if (epics.length > 0) {
          throw new ValidationError('Cannot delete initiative with linked epics');
        }
        return this.initiativeRepository.delete(id);
      case 'EPIC':
        // Check if there are any stories linked to this epic
        const stories = await this.storyRepository.findByEpic(id);
        if (stories.length > 0) {
          throw new ValidationError('Cannot delete epic with linked stories');
        }
        return this.epicRepository.delete(id);
      case 'STORY':
        // Check if there are any tasks linked to this story
        const tasks = await this.taskRepository.findByStory(id);
        if (tasks.length > 0) {
          throw new ValidationError('Cannot delete story with linked tasks');
        }
        return this.storyRepository.delete(id);
      case 'TASK':
        return this.taskRepository.delete(id);
      default:
        throw new ValidationError('Invalid task type');
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string, type: string): Promise<AnyTask | null> {
    switch (type) {
      case 'INITIATIVE':
        return this.initiativeRepository.findById(id);
      case 'EPIC':
        return this.epicRepository.findById(id);
      case 'STORY':
        return this.storyRepository.findById(id);
      case 'TASK':
        return this.taskRepository.findById(id);
      default:
        throw new ValidationError('Invalid task type');
    }
  }

  /**
   * Get tasks by workspace
   */
  async getTasksByWorkspace(workspace_id: string): Promise<{
    initiatives: IInitiative[];
    epics: IEpic[];
    stories: IStory[];
    tasks: ITask[];
  }> {
    const [initiatives, epics, stories, tasks] = await Promise.all([
      this.initiativeRepository.findByWorkspace(workspace_id),
      this.epicRepository.findByWorkspace(workspace_id),
      this.storyRepository.findByWorkspace(workspace_id),
      this.taskRepository.findByWorkspace(workspace_id)
    ]);

    return {
      initiatives,
      epics,
      stories,
      tasks
    };
  }

  /**
   * Get tasks by assignee
   */
  async getTasksByAssignee(assignee_id: string): Promise<{
    initiatives: IInitiative[];
    epics: IEpic[];
    stories: IStory[];
    tasks: ITask[];
  }> {
    const [initiatives, epics, stories, tasks] = await Promise.all([
      this.initiativeRepository.findByAssignee(assignee_id),
      this.epicRepository.findByAssignee(assignee_id),
      this.storyRepository.findByAssignee(assignee_id),
      this.taskRepository.findByAssignee(assignee_id)
    ]);

    return {
      initiatives,
      epics,
      stories,
      tasks
    };
  }

  /**
   * Get tasks by creator
   */
  async getTasksByCreator(creator_id: string): Promise<{
    initiatives: IInitiative[];
    epics: IEpic[];
    stories: IStory[];
    tasks: ITask[];
  }> {
    const [initiatives, epics, stories] = await Promise.all([
      this.initiativeRepository.findByCreator(creator_id),
      this.epicRepository.findByWorkspace(creator_id), // Note: EpicRepository doesn't have findByCreator
      this.storyRepository.findByWorkspace(creator_id)  // Note: StoryRepository doesn't have findByCreator
    ]);

    // For tasks, we need to filter by creator_id since there's no direct method
    const allTasks = await this.taskRepository.findByWorkspace(creator_id); // This needs to be fixed
    const tasks = allTasks.filter(task => task.creator_id === creator_id);

    return {
      initiatives,
      epics,
      stories,
      tasks
    };
  }

  /**
   * Get tasks with hierarchy
   */
  async getTasksWithHierarchy(workspace_id: string): Promise<{
    initiatives: Array<IInitiative & {
      epics: Array<IEpic & {
        stories: Array<IStory & {
          tasks: ITask[];
        }>;
      }>;
    }>;
  }> {
    // Get all initiatives
    const initiatives = await this.initiativeRepository.findByWorkspace(workspace_id);
    
    // For each initiative, get its epics
    const initiativesWithEpics = await Promise.all(
      initiatives.map(async (initiative) => {
        const epics = await this.epicRepository.findByInitiative(initiative.id);
        
        // For each epic, get its stories
        const epicsWithStories = await Promise.all(
          epics.map(async (epic) => {
            const stories = await this.storyRepository.findByEpic(epic.id);
            
            // For each story, get its tasks
            const storiesWithTasks = await Promise.all(
              stories.map(async (story) => {
                const tasks = await this.taskRepository.findByStory(story.id);
                return {
                  ...story,
                  tasks
                };
              })
            );
            
            return {
              ...epic,
              stories: storiesWithTasks
            };
          })
        );
        
        return {
          ...initiative,
          epics: epicsWithStories
        };
      })
    );
    
    return {
      initiatives: initiativesWithEpics
    };
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(workspace_id: string, status: string): Promise<{
    initiatives: IInitiative[];
    epics: IEpic[];
    stories: IStory[];
    tasks: ITask[];
  }> {
    const [initiatives, epics, stories, tasks] = await Promise.all([
      this.initiativeRepository.getInitiativesWithPagination(workspace_id, 1, 1000, { status }),
      this.epicRepository.getEpicsWithPagination(workspace_id, 1, 1000, { status }),
      this.storyRepository.getStoriesWithPagination(workspace_id, 1, 1000, { status }),
      this.taskRepository.getTasksWithPagination(workspace_id, 1, 1000, { status })
    ]);

    return {
      initiatives: initiatives.initiatives,
      epics: epics.epics,
      stories: stories.stories,
      tasks: tasks.tasks
    };
  }

  /**
   * Get task statistics
   */
  async getTaskStats(workspace_id: string): Promise<TaskStats> {
    const [initiatives, epics, stories, tasks] = await Promise.all([
      this.initiativeRepository.findByWorkspace(workspace_id),
      this.epicRepository.findByWorkspace(workspace_id),
      this.storyRepository.findByWorkspace(workspace_id),
      this.taskRepository.findByWorkspace(workspace_id)
    ]);

    const allTasks = [...initiatives, ...epics, ...stories, ...tasks];

    const now = new Date();

    const stats: TaskStats = {
      total: allTasks.length,
      completed: allTasks.filter(task => task.status === 'COMPLETED').length,
      inProgress: allTasks.filter(task => task.status === 'IN_PROGRESS').length,
      inReview: allTasks.filter(task => task.status === 'REVIEW').length,
      created: allTasks.filter(task => task.status === 'CREATED').length,
      highPriority: allTasks.filter(task => task.priority === 'HIGH').length,
      mediumPriority: allTasks.filter(task => task.priority === 'MEDIUM').length,
      lowPriority: allTasks.filter(task => task.priority === 'LOW').length,
      overdue: allTasks.filter(task =>
        task.end_date !== undefined &&
        new Date(task.end_date).getTime() < now.getTime()
      ).length
    };

    return stats;
  }

  /**
   * Validate task hierarchy constraints
   */
  private validateTaskHierarchy(
    type: string, 
    initiative_id?: string, 
    epic_id?: string, 
    story_id?: string
  ): void {
    switch (type) {
      case 'INITIATIVE':
        if (initiative_id || epic_id || story_id) {
          throw new ValidationError('Initiative cannot be linked to any parent task');
        }
        break;
      case 'EPIC':
        if (!initiative_id || epic_id || story_id) {
          throw new ValidationError('Epic must be linked to an initiative only');
        }
        break;
      case 'STORY':
        if (!epic_id || initiative_id || story_id) {
          throw new ValidationError('Story must be linked to an epic only');
        }
        break;
      case 'TASK':
        if (!story_id || initiative_id || epic_id) {
          throw new ValidationError('Task must be linked to a story only');
        }
        break;
      default:
        throw new ValidationError('Invalid task type');
    }
  }
}