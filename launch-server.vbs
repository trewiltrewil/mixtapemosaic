Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root
command = "cmd /d /k npm.cmd run dev > dev-server.log 2> dev-server.err"
shell.Run command, 0, False
