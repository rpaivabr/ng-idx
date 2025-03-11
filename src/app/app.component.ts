import { AfterViewInit, Component } from '@angular/core';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {

  ngAfterViewInit() {
    // Set up basic variables for app
    const record = document.querySelector(".record") as HTMLButtonElement;
    const stop = document.querySelector(".stop") as HTMLButtonElement;
    const soundClips = document.querySelector(".sound-clips") as HTMLDivElement;
    const canvas = document.querySelector(".visualizer") as HTMLCanvasElement;
    const mainSection = document.querySelector(".main-controls") as HTMLDivElement;

    // Disable stop button while not recording
    stop.disabled = true;

    // Visualiser setup - create web audio api context and canvas
    let audioCtx: AudioContext;
    const canvasCtx = canvas.getContext("2d")!;

    // Main block for doing the audio recording
    if (navigator.mediaDevices.getUserMedia) {
      console.log("The mediaDevices.getUserMedia() method is supported.");

      const constraints = { audio: true };
      let chunks: any[] = [];

      let onSuccess = function (stream: any) {
        const mediaRecorder = new MediaRecorder(stream);

        visualize(stream);

        record.onclick = function () {
          mediaRecorder.start();
          console.log(mediaRecorder.state);
          console.log("Recorder started.");
          record.style.background = "red";

          stop.disabled = false;
          record.disabled = true;
        };

        stop.onclick = function () {
          mediaRecorder.stop();
          console.log(mediaRecorder.state);
          console.log("Recorder stopped.");
          record.style.background = "";
          record.style.color = "";

          stop.disabled = true;
          record.disabled = false;
        };

        mediaRecorder.onstop = function (e) {
          console.log("Last data to read (after MediaRecorder.stop() called).");

          const clipName = prompt(
            "Enter a name for your sound clip?",
            "My unnamed clip"
          );

          const clipContainer = document.createElement("article");
          const clipLabel = document.createElement("p");
          const audio = document.createElement("audio");
          const deleteButton = document.createElement("button");

          clipContainer.classList.add("clip");
          audio.setAttribute("controls", "");
          deleteButton.textContent = "Delete";
          deleteButton.className = "delete";

          if (clipName === null) {
            clipLabel.textContent = "My unnamed clip";
          } else {
            clipLabel.textContent = clipName;
          }

          clipContainer.appendChild(audio);
          clipContainer.appendChild(clipLabel);
          clipContainer.appendChild(deleteButton);
          soundClips.appendChild(clipContainer);

          audio.controls = true;
          console.log(mediaRecorder.mimeType)
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
          chunks = [];
          const audioURL = window.URL.createObjectURL(blob);
          audio.src = audioURL;
          console.log("recorder stopped");

          // function arrayBufferToBase64(buffer: ArrayBuffer) {
          //   var binary = "";
          //   var bytes = new Uint8Array(buffer);
          //   var len = bytes.byteLength;
          //   for (var i = 0; i < len; i++) {
          //     binary += String.fromCharCode(bytes[i]);
          //   }
          //   return window.btoa(binary);
          // }

          const reader = new window.FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function () {
            console.log(reader.result);
            generate(reader.result as string);
          }


          deleteButton.onclick = function (e) {
            const target = e.target as HTMLButtonElement;
            target!.closest(".clip")!.remove();
          };

          clipLabel.onclick = function () {
            const existingName = clipLabel.textContent;
            const newClipName = prompt("Enter a new name for your sound clip?");
            if (newClipName === null) {
              clipLabel.textContent = existingName;
            } else {
              clipLabel.textContent = newClipName;
            }
          };
        };

        mediaRecorder.ondataavailable = function (e) {
          chunks.push(e.data);
        };
      };

      let onError = function (err: any) {
        console.log("The following error occured: " + err);
      };

      navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
    } else {
      console.log("MediaDevices.getUserMedia() not supported on your browser!");
    }

    function visualize(stream: any) {
      if (!audioCtx) {
        audioCtx = new AudioContext();
      }

      const source = audioCtx.createMediaStreamSource(stream);

      const bufferLength = 2048;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = bufferLength;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      draw();

      function draw() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = "rgb(200, 200, 200)";
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "rgb(0, 0, 0)";

        canvasCtx.beginPath();

        let sliceWidth = (WIDTH * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let v = dataArray[i] / 128.0;
          let y = (v * HEIGHT) / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      }
    }

    window.onresize = function () {
      canvas.width = mainSection.offsetWidth;
    };

    window.onresize(new UIEvent('resize'));
  }
}

async function generate(base64: string) {
  const apiKey = 'AIzaSyDgxQ-1G3OCa7sebtA8B_6fDMoiQJbk768';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

  const filePart: Part = {
    inlineData: {
      data: base64.split(',')[1],
      mimeType: 'audio/webm;codecs=opus',
    }
    // fileData: {
    //   fileUri,
    //   mimeType: 'audio/mpeg',
    // }
  };
  const textPart: Part = {
    // text: `
    // Can you transcribe this interview, in the format of timecode, speaker, caption?
    // Use speaker A, speaker B, etc. to identify speakers.`,
    // text: 'dado o audio, referente a leitura da frase em ingles "I wanna travel to Japan next year and I like soda.", me de uma nota de 0 a 10 quanto a qualidade da pronúncia em inglês, e sugestões para melhoria. o formato da resposta será em JSON apenas, com uma propriedade number chamada "Rating" e outra propriedade array de strings com no máximo 3 frases de até 20 palavras com dicas de melhoria (as sugestões em português)',
    text: 'transcreva o audio: '
  };

  const request = {
    contents: [{ role: 'user', parts: [filePart, textPart] }],
  };
  const result = await model.generateContent(request);
  const text = result.response.text();
  // // Remove a parte externa do JSON
  // const jsonInterno = text.replace(/`json\n|\n`/g, '');

  // // Converte a string JSON interna em um objeto JavaScript
  // const objetoJson = JSON.parse(jsonInterno);

  // console.log(JSON.parse(text.slice(7, -4)));
  console.log(text);
}