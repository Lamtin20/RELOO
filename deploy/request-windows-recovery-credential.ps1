[CmdletBinding()]
param([ValidateSet('Windows','Sunshine')][string]$Kind='Windows',[string]$UserName='')
$ErrorActionPreference='Stop'
$recoveryDirectory=Join-Path $env:LOCALAPPDATA 'RELOO-Recovery'
New-Item -ItemType Directory -Path $recoveryDirectory -Force | Out-Null
$recoveryStatus=Join-Path $recoveryDirectory $(if($Kind -eq 'Windows'){'credential-status.json'}else{'sunshine-credential-status.json'})
try {
 if($Kind -eq 'Windows' -and !$UserName){$UserName='DESKTOP-DJ1NMKK\KENT'}
 $message=if($Kind -eq 'Windows'){'RELOO: actual Windows KENT password, not a PIN. Encrypted locally using Windows DPAPI; never sent to chat or logs.'}else{'RELOO: Sunshine web administration account for server 100.122.200.65. This is NOT the Windows KENT account. Encrypted locally using Windows DPAPI; never sent to chat or logs.'}
 Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class RelooCredentialDialog {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct Info {public int size;public IntPtr parent;public string message;public string caption;public IntPtr banner;}
 [DllImport("credui.dll",CharSet=CharSet.Unicode)] public static extern int CredUIPromptForCredentials(ref Info info,string target,IntPtr reserved,int error,StringBuilder user,int userMax,StringBuilder password,int passwordMax,ref bool save,int flags);
}
'@
 $dialogInfo=New-Object RelooCredentialDialog+Info
 $dialogInfo.size=[Runtime.InteropServices.Marshal]::SizeOf($dialogInfo)
 $dialogInfo.message=$message
 $dialogInfo.caption='RELOO - '+$Kind+' server recovery'
 $dialogUser=[Text.StringBuilder]::new(1024)
 $null=$dialogUser.Append($UserName)
 $dialogPassword=[Text.StringBuilder]::new(1024)
 $dialogSave=$false
 $dialogResult=[RelooCredentialDialog]::CredUIPromptForCredentials([ref]$dialogInfo,'100.122.200.65 - '+$Kind,[IntPtr]::Zero,0,$dialogUser,1024,$dialogPassword,1024,[ref]$dialogSave,0x40082)
 if($dialogResult -eq 1223){@{ready=$false;cancelled=$true}|ConvertTo-Json|Set-Content -LiteralPath $recoveryStatus;exit 2}
 if($dialogResult -ne 0){throw 'CREDENTIAL_UI_UNAVAILABLE'}
 $dialogSecurePassword=[Security.SecureString]::new()
 foreach($character in $dialogPassword.ToString().ToCharArray()){$dialogSecurePassword.AppendChar($character)}
 $dialogSecurePassword.MakeReadOnly()
 $recoveryCredential=[pscredential]::new($dialogUser.ToString(),$dialogSecurePassword)
 $null=$dialogPassword.Clear()
 if(!$recoveryCredential){@{ready=$false;cancelled=$true}|ConvertTo-Json|Set-Content -LiteralPath $recoveryStatus;exit 2}
 if($recoveryCredential.Password.Length -eq 0){@{ready=$false;cancelled=$false;error='WINDOWS_PASSWORD_EMPTY'}|ConvertTo-Json|Set-Content -LiteralPath $recoveryStatus;exit 3}
 $recoveryCredential | Export-Clixml -LiteralPath (Join-Path $recoveryDirectory ($Kind.ToLowerInvariant()+'-server.credential.xml'))
 @{ready=$true;cancelled=$false;savedAt=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath $recoveryStatus
} catch {
 @{ready=$false;cancelled=$false;error='CREDENTIAL_PROMPT_FAILED'}|ConvertTo-Json|Set-Content -LiteralPath $recoveryStatus
 exit 1
}
