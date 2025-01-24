// js/tools/tools-manager.js

import { Logger } from '../utils/logger.js';
// Import your tool classes here (e.g., GoogleSearchTool, WeatherTool, etc.)
// import { GoogleSearchTool } from './google-search.js'; // Example
// import { WeatherTool } from './weather-tool.js'; // Example


export class ToolManager {
    constructor() {
        this.tools = new Map();
        this.registerDefaultTools();
    }

    registerDefaultTools() {
        // this.registerTool('googleSearch', new GoogleSearchTool());  // Example
        // this.registerTool('weather', new WeatherTool()); // Example
          // Add your custom tool here
         //   this.registerTool('saveScribe', new SaveScribeTool());
        this.registerTool('imageGenerator', new ImageGeneratorTool());
         this.registerTool('scribeGenerator', new ScribeGeneratorTool());
    }

     registerTool(name, tool) {
        if (this.tools.has(name)) {
            Logger.warn(`Tool with name '${name}' already registered. Overwriting.`);
        }
        this.tools.set(name, tool);
    }

    async executeTool(toolName, args) {
      if (!this.tools.has(toolName)) {
            Logger.error(`Tool with name '${toolName}' not found.`);
          return `Tool with name '${toolName}' not found.`;
       }

      const tool = this.tools.get(toolName);
      try{
           const result = await tool.execute(args);
            return result;
        }catch (error){
            Logger.error(`Error executing tool '${toolName}':`, error);
            return `Error executing tool '${toolName}': ${error.message}`;
         }
    }
      getToolDeclarations(){
         const declarations = [];
         for(const tool of this.tools.values()){
            declarations.push(...tool.getDeclaration());
         }
        return declarations;
     }
}

//Placeholder tool for Image Generator, you can include the together API here
class ImageGeneratorTool{
    getDeclaration() {
        return [{
            name: "imageGenerator",
            description: "This tool will generate images based on the prompt",
              parameters: {
                 type: "object",
                    properties: {
                         prompt: {
                            type: "string",
                             description: "the prompt for the image generation",
                        },
                   },
                  required: ["prompt"],
                },
        }];
    }

    async execute(args){
        try{
            Logger.info('Executing ImageGeneratorTool', args);
              const togetherApiKey = '02ca6696345d914c6941d7007b762c2b3ef0e07a4a58188e6ecb09d854c44f5c';

             const response = await fetch("https://api.together.xyz/v1/images/generations", {
            method: "POST",
             headers: {
                "Authorization": `Bearer ${togetherApiKey}`,
                "Content-Type": "application/json",
            },
             body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell-Free",
                prompt: args.prompt,
                width: 1024,
                height: 768,
                steps: 1,
                n: 1,
                response_format: "url",
            }),
        });

        if (!response.ok) {
            throw new Error(`Image generation API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.data[0].url;

        } catch (error){
             Logger.error('Image generation failed', error);
             throw error;
         }
    }
}

class ScribeGeneratorTool {
      getDeclaration() {
        return [{
           name: "scribeGenerator",
           description: "This tool will generate a medical scribe base on the user input, using the Pediatric SOAP Note form.",
            parameters: {
               type: "object",
               properties: {
                    title: {type: "string", description: "Title of the document."},
                    patientName: {type: "string", description: "Name of the patient."},
                    assignedMedicalPractitioner: {type: "string", description: "Assigned medical practitioner."},
                    conductedOn: {type: "string", description: "Date when the assessment was conducted."},
                    location: {type: "string", description: "Location where the assessment was conducted."},
                    age: {type: "string", description: "Patient's age."},
                    race: {type: "string", description: "Patient's race."},
                    gender: {type: "string", description: "Patient's gender."},
                    chiefComplaint: {type: "string", description: "Main reason for the patient's visit."},
                    historyOfIllness: {type: "string", description: "Details about how the patient got sick."},
                    pastMedicalHistory: {type: "string", description: "The patients past medical history, including alergies."},
                     familyHistory: {type: "string", description: "Any relevant family medical history."},
                    socialHistory: {type: "string", description: "Patient's social background and context."},
                    reviewOfSystems: {type: "string", description: "Findings about patient's systems, like pain, and eating habits."},
                    height: {type: "string", description: "Patient's height."},
                    weight: {type: "string", description: "Patient's weight."},
                    bmi: {type: "string", description: "Patient's Body Mass Index"},
                    temperature: {type: "string", description: "Patient's temperature."},
                    bloodPressure: {type: "string", description: "Patient's blood pressure."},
                    generalAppearance: {type: "string", description: "How the patient looks generally."},
                    eent: {type: "string", description: "Examination results for Ears, Eyes, Nose, and Throat"},
                    cardiovascular: {type: "string", description: "Results of patient's cardio vascular examination."},
                    respiratory: {type: "string", description: "Results of patient's respiratory examination."},
                    integument: {type: "string", description: "Results of patient's skin examination."},
                    labResults: {type: "string", description: "Results of patient's lab results."},
                    generalObservations: {type: "string", description: "Additional medical observations."},
                    differentialDiagnosis: {type: "string", description: "Possible differential diagnosis."},
                     treatmentPlan: {type: "string", description: "Patient's treatment plan"},
                     followUp: {type: "string", description: "Patient's follow up plan."},
                     education: {type: "string", description: "Patient's education plan."},
                    printedName: {type: "string", description: "Medical practitioner's printed name."},
                    date: {type: "string", description: "Date when document was generated."},
               },
                 required: ["patientName", "age", "chiefComplaint"],
            },
        }];
    }

    async execute(args){
        try {
           Logger.info('Executing ScribeGeneratorTool', args);
            return JSON.stringify(args);
        } catch (error){
            Logger.error("Scribe generation failed:", error);
            throw error;
        }
    }
}
