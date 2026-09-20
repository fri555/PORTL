$ErrorActionPreference = 'Stop'
$ffmpeg = 'C:\Users\Administrator\.local\ffmpeg\bin\ffmpeg.exe'
$ffprobe = 'C:\Users\Administrator\.local\ffmpeg\bin\ffprobe.exe'
$dir = 'D:\工作\portal\output\天马智擎AI展示方案\短视频Demo'

$segmentFiles = @()
for ($i = 1; $i -le 8; $i++) {
  $id = '{0:D2}' -f $i
  $img = Join-Path $dir "scene-$id.png"
  $wav = Join-Path $dir "voice-$id.wav"
  $seg = Join-Path $dir "segment-$id.mp4"
  $audioDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $wav)
  $duration = [math]::Ceiling($audioDuration + 1.2)
  $frames = [int]($duration * 30)
  $fadeOut = [math]::Max(0.5, $duration - 0.55)
  & $ffmpeg -y -loop 1 -i $img -i $wav -filter_complex "[0:v]scale=2048:1152,zoompan=z='min(zoom+0.00022,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=hd1080:fps=30,fade=t=in:st=0:d=0.45,fade=t=out:st=${fadeOut}:d=0.5,format=yuv420p[v];[1:a]apad=pad_dur=2,afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOut}:d=0.4[a]" -map '[v]' -map '[a]' -t $duration -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k $seg | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Scene $id encoding failed" }
  $segmentFiles += $seg
}

$concat = Join-Path $dir 'segments.txt'
$segmentFiles | ForEach-Object { "file '$([System.IO.Path]::GetFileName($_))'" } | Set-Content -LiteralPath $concat -Encoding utf8NoBOM
$voiceVideo = Join-Path $dir '天马智擎-90秒短视频Demo-带旁白.mp4'
& $ffmpeg -y -f concat -safe 0 -i $concat -c copy $voiceVideo | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Video concatenation failed' }

$totalDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $voiceVideo)
$ambient = Join-Path $dir 'ambient.wav'
& $ffmpeg -y -f lavfi -i "aevalsrc=0.018*(sin(2*PI*82*t)+0.55*sin(2*PI*123*t)+0.28*sin(2*PI*164*t))*(0.7+0.3*sin(2*PI*0.07*t)):s=44100:d=$totalDuration" -af 'lowpass=f=850,highpass=f=55,afade=t=in:st=0:d=3' $ambient | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Ambient audio generation failed' }

$withMusic = Join-Path $dir '天马智擎-90秒短视频Demo-旁白配乐版.mp4'
& $ffmpeg -y -i $voiceVideo -i $ambient -filter_complex '[0:a]volume=1.0[a0];[1:a]volume=0.22[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[a]' -map 0:v -map '[a]' -c:v copy -c:a aac -b:a 192k $withMusic | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Narrated video mix failed' }

$silent = Join-Path $dir '天马智擎-90秒短视频Demo-无旁白版.mp4'
& $ffmpeg -y -i $voiceVideo -i $ambient -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest $silent | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'No-voice video mix failed' }

[pscustomobject]@{Duration=[math]::Round($totalDuration,1);WithVoice=$withMusic;NoVoice=$silent} | ConvertTo-Json
