// js/tools/tools-manager.js

import { Logger } from '../utils/logger.js';
import { ApplicationError, ErrorCodes } from '../utils/error-boundary.js';
import { GoogleSearchTool } from './google-search.js';
import { WeatherTool } from './weather-tool.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, doc, updateDoc} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

/**
 * Manages the registration and execution of tools.
 * Tools are used to extend the functionality of the Gemini API, allowing it to interact with external services.
 */
export class ToolManager {
    /**
     * Creates a new ToolManager and registers default tools.
     */
    constructor() {
        this.tools = new Map();
        this.registerDefaultTools();
    }

    /**
     * Registers the default tools: GoogleSearchTool and WeatherTool.
     */
    registerDefaultTools() {
        this.registerTool('googleSearch', new GoogleSearchTool());
        this.registerTool('weather', new WeatherTool());
         this.registerTool('imageGenerator', new ImageGeneratorTool());
         this.registerTool('scribeGenerator', new ScribeGeneratorTool());
          this.registerTool('updateScribe', new UpdateScribeTool());
    }

    /**
     * Registers a new tool.
     *
     * @param {string} name - The name of the tool.
     * @param {Object} toolInstance - The tool instance. Must have a `getDeclaration` method.
     * @throws {ApplicationError} Throws an error if a tool with the same name is already registered.
     */
    registerTool(name, toolInstance) {
        if (this.tools.has(name)) {
            throw new ApplicationError(
                `Tool ${name} is already registered`,
                ErrorCodes.INVALID_STATE
            );
        }
        this.tools.set(name, toolInstance);
        Logger.info(`Tool ${name} registered successfully`);
    }

    /**
     * Returns the tool declarations for all registered tools.
     * These declarations are used by the Gemini API to understand what tools are available.
     *
     * @returns {Object[]} An array of tool declarations.
     */
    getToolDeclarations() {
       const allDeclarations = [];
       this.tools.forEach((tool, name) => {
            if (tool.getDeclaration) {
               allDeclarations.push(...tool.getDeclaration());
            }
        });

        return allDeclarations;
    }

    /**
     * Handles a tool call from the Gemini API.
     * Executes the specified tool with the given arguments.
     *
     * @param {Object} functionCall - The function call object from the Gemini API.
     * @param {string} functionCall.name - The name of the tool to execute.
     * @param {Object} functionCall.args - The arguments to pass to the tool.
     * @param {string} functionCall.id - The ID of the function call.
     * @returns {Promise<Object>} A promise that resolves with the tool's response.
     * @throws {ApplicationError} Throws an error if the tool is unknown or if the tool execution fails.
     */
    async handleToolCall(functionCall) {
        const { name, args, id } = functionCall;
        Logger.info(`Handling tool call: ${name}`, { args });

       let tool;
        if (name === 'get_weather_on_date') {
            tool = this.tools.get('weather');
        } else {
            tool = this.tools.get(name);
        }
        if (!tool) {
            throw new ApplicationError(
                `Unknown tool: ${name}`,
                ErrorCodes.INVALID_PARAMETER
            );
        }

        try {
             const result = await tool.execute(args);
             return {
                 functionResponses: [{
                     response: { output: result },
                     id
                 }]
             };
         } catch (error) {
             Logger.error(`Tool execution failed: ${name}`, error);
            return {
                 functionResponses: [{
                     response: { error: error.message },
                     id
                 }]
             };
         }
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

class UpdateScribeTool {
    getDeclaration() {
          return [{
              name: "updateScribe",
               description: "This tool will update a medical scribe base on the user input.",
               parameters: {
                   type: "object",
                   properties: {
                      docId: {type: "string", description: "Id of document in firestore"},
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
                 required: ["docId"],
              },
        }];
    }

    async execute(args){
         try {
                Logger.info('Executing UpdateScribeTool', args);
            
              const firebaseConfig = {
                    apiKey: "AIzaSyBe9a58zaQCrBSGeWwcIVa_PnZABoH6zV4",
                    authDomain: "tudds-ccd0wn.firebaseapp.com",
                   databaseURL: "https://tudds-ccd0wn-default-rtdb.asia-southeast1.firebasedatabase.app",
                   projectId: "tudds-ccd0wn",
                    storageBucket: "tudds-ccd0wn.appspot.com",
                   messagingSenderId: "786974954352",
                    appId: "1:786974954352:web:696d4fce818f14659bb5b5",
                     measurementId: "G-CEQL4E8CW3"
                };

                // Initialize Firebase
               const app = initializeApp(firebaseConfig);
                const db = getFirestore(app);
                const {docId, ...scribeData} = args;
               const docRef = doc(db, "scribe_documents", docId);
                await updateDoc(docRef, scribeData);
                return "Scribe updated successfully!";
          } catch (error) {
            Logger.error("Scribe update failed:", error);
               throw error;
         }
    }
}
