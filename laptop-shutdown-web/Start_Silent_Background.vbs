' PowerPulse Silent Background Launcher
' Starts python server.py completely invisibly with zero console window.
Dim WshShell, fso, scriptDir, pythonPath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = scriptDir

' Check if already running on port 7890
Dim httpCheck
On Error Resume Next
Set httpCheck = CreateObject("MSXML2.ServerXMLHTTP.6.0")
httpCheck.open "GET", "http://127.0.0.1:7890/api/status", False
httpCheck.send ""
If Err.Number = 0 And httpCheck.status = 200 Then
    ' Already running
    WScript.Quit 0
End If
On Error GoTo 0

' Launch python server.py with hidden window (0 = hidden, False = return immediately)
WshShell.Run "python server.py", 0, False
