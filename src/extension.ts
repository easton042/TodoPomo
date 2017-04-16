'use strict';
import * as vscode from 'vscode';
import { Pomodoro } from './pomodoro';
import { StatusBar } from './ui';

export function activate(context: vscode.ExtensionContext) {
	const pomodoro = Pomodoro.getInstance();
	const statusBars = StatusBar.getInstance();
	pomodoro.preload();
	statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length);
    let disposable = vscode.commands.registerCommand(`todopomo.start`, () => pomodoro.start());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(`todopomo.pause`, () => pomodoro.pause());	
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(`todopomo.stop`, () => pomodoro.stop());	
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(`todopomo.report`, () => pomodoro.report());	
    context.subscriptions.push(disposable);
}