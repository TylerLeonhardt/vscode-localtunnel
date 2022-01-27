// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as localtunnel from 'localtunnel';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const activeTunnels = new Map<Number, localtunnel.Tunnel>();

	context.subscriptions.push(vscode.commands.registerCommand('localtunnel.expose', async () => {
		const portStr = await vscode.window.showInputBox({
			prompt: 'What port would you like to tunnel? (ex. 8080)',
			validateInput(value) {
				let port;
				try {
					port = Number.parseInt(value);
				} catch (e) {
					return 'Not a valid number';
				}
				if (activeTunnels.has(port)) {
					return `That port is already open with url: ${activeTunnels.get(port)!.url}`;
				}
				return undefined;
			}
		});
		
		if (!portStr) {
			return;
		}

		const port = Number.parseInt(portStr);

		const tunnel = await localtunnel({ port });
		tunnel.on('error', (err) => {
			vscode.window.showErrorMessage(`Tunnel with port ${portStr} threw an error: ${err}`);
			activeTunnels.delete(port);
			try {
				tunnel.close();
			} catch(e) {
				vscode.window.showErrorMessage(`Closing tunnel with port ${portStr} threw an error: ${err}`);
			}
		});
		activeTunnels.set(port, tunnel);
		const choice = await vscode.window.showInformationMessage(`Your port, ${portStr}, is exposed via: ${tunnel.url}`, 'Open Url');
		if (choice === 'Open Url') {
			await vscode.env.openExternal(vscode.Uri.parse(tunnel.url));
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('localtunnel.close', async () => {
		const items: Array<vscode.QuickPickItem & { port: Number, tunnel: localtunnel.Tunnel}> = [];
		for (const [key, value] of activeTunnels) {
			items.push({
				label: `${key}`,
				description: value.url,
				port: key,
				tunnel: value
			});
		}

		const choice = await vscode.window.showQuickPick(items, {
			placeHolder: 'Which tunnel would you would like to close?'
		});

		if (!choice) {
			return;
		}

		activeTunnels.delete(choice.port);
		choice.tunnel.close();
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
