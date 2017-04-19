import * as vscode from 'vscode';
import { Task } from './task';
import { TimeUnits, Timer } from './timer';
import { getConfig } from './config';
import { YesNoPrompt, InputPrompt, StatusBar } from './ui';
import { TaskStorage } from './storage';
import {TextDocument, TextLine, Position, CompletionItem, Range} from 'vscode';
import {TextEditor, TextEditorEdit} from 'vscode';
import {TodoDocument} from './TodoDocument'

export class Pomodoro {
	private static _instance: Pomodoro;
	private static _textEditor: TextEditor;
	private static _edit: TextEditorEdit;

	private _statusBars: StatusBar = StatusBar.getInstance();

	private _storage: TaskStorage;

	public tasks: Task[];
	public task: Task;
	public completedTasksCounter: number;
	public currentTaskIndex: number;

	private breakCounter: number;

	private _timer: Timer;

	private constructor(private textEditor: TextEditor, private edit: TextEditorEdit) {
		this.tasks = [] as Task[];
		this.completedTasksCounter = 0;
		this.breakCounter = 0;
		this._storage = new TaskStorage(getConfig().tasks_file);
	}

	public static getInstance(textEditor?: TextEditor, edit?: TextEditorEdit): Pomodoro {	
		// easton: only todopomo.start command need textEditor	
		if (Pomodoro._instance === null || Pomodoro._instance === undefined || 
				Pomodoro._textEditor === null || Pomodoro._textEditor === undefined) {
			Pomodoro._instance =  new Pomodoro(textEditor, edit);
		}
		return Pomodoro._instance;
	}

	public preload() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro._storage.load();

		for (let taskIndex in pomodoro.tasks) {			
			if (pomodoro.tasks[taskIndex].startTime === null) {				
				break;
			} else {				
				if (pomodoro.tasks[taskIndex].isCompleted) {
					pomodoro.completedTasksCounter ++;
				} else {
					pomodoro.currentTaskIndex = parseInt(taskIndex);
				}
			}
		}
		
		if (pomodoro.currentTaskIndex !== undefined && pomodoro.tasks[pomodoro.currentTaskIndex].startTime !== null) {
			pomodoro.start();
		}
	}

	public async addTask() {
		const pomodoro = Pomodoro.getInstance();
		const newTask: string = await InputPrompt(`Add a new task to the Pomodoro`, `task name`);

		pomodoro.tasks.push(new Task(newTask, null));
		pomodoro._storage.save();

		pomodoro._statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length)
	}

	public start() {
		const pomodoro = Pomodoro.getInstance();
		let task = new TodoDocument(this.textEditor.document).getTaskPlusProjects(this.textEditor.selection.start);
		if (task){
			pomodoro._statusBars.updateCurrentTask(`Focus: `+task.getTask());
			pomodoro.task = new Task(task.getTask(), null);
			pomodoro._timer = pomodoro.task.startTask(()=>{});
			pomodoro._storage.save();
		}
	}

	public pause() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.pickTask();
		if (pomodoro.currentTaskIndex < pomodoro.tasks.length) {
			pomodoro._statusBars.updateCurrentTask(`Focus: `+pomodoro.tasks[pomodoro.currentTaskIndex].name)
		
			pomodoro._timer = pomodoro.tasks[pomodoro.currentTaskIndex].startTask(pomodoro.askAboutTaskCompletion);
			pomodoro._storage.save();	
		} else {
			return;
		}
	}
	public stop() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.pickTask();
		if (pomodoro.currentTaskIndex < pomodoro.tasks.length) {
			pomodoro._statusBars.updateCurrentTask(`Focus: `+pomodoro.tasks[pomodoro.currentTaskIndex].name)
		
			pomodoro._timer = pomodoro.tasks[pomodoro.currentTaskIndex].startTask(pomodoro.askAboutTaskCompletion);
			pomodoro._storage.save();	
		} else {
			return;
		}
	}

	public report() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.pickTask();
		if (pomodoro.currentTaskIndex < pomodoro.tasks.length) {
			pomodoro._statusBars.updateCurrentTask(`Focus: `+pomodoro.tasks[pomodoro.currentTaskIndex].name)
		
			pomodoro._timer = pomodoro.tasks[pomodoro.currentTaskIndex].startTask(pomodoro.askAboutTaskCompletion);
			pomodoro._storage.save();	
		} else {
			return;
		}
	}

	private pickTask(): void {
		const pomodoro = Pomodoro.getInstance();
		if (pomodoro.tasks.length > 0) {
			if (pomodoro.currentTaskIndex === undefined) {
				pomodoro.currentTaskIndex = 0;
			} else {
				if (pomodoro.tasks[pomodoro.currentTaskIndex].isCompleted) {
					pomodoro.currentTaskIndex += 1;
				}
			}
		}
	}

	private async askAboutTaskCompletion() {
		const pomodoro = Pomodoro.getInstance();
		const response: boolean = await YesNoPrompt(`Did you finish the task?`);
		if(response) {
			pomodoro.tasks[pomodoro.currentTaskIndex].CompleteTask();
			pomodoro._statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length)
			pomodoro._storage.save();
		}
		pomodoro.takeBreak();
	}

	private takeBreak(): void {
		const pomodoro = Pomodoro.getInstance();		
		if (pomodoro.breakCounter < getConfig().counter_to_long_break) {
			pomodoro._timer = new Timer(getConfig().break_duration, TimeUnits.Milliseconds);
			pomodoro.breakCounter++;
		} else {
			pomodoro._timer = new Timer(getConfig().long_break_duration, TimeUnits.Milliseconds);
			pomodoro.breakCounter = 0;
		}
		pomodoro._statusBars.updateCurrentTask(`Break`);
		pomodoro._timer.start(pomodoro.start);
	}

	public clearCompleted(): void {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.tasks = pomodoro.tasks.filter(function (task) {
			return !task.isCompleted;
		});

		pomodoro.completedTasksCounter = 0;
		pomodoro.currentTaskIndex = undefined;
		pomodoro._storage.save();
		pomodoro._statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length)
	}
}