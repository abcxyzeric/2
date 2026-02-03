import { GameSession, Preset, PromptDefinition, WorldInfo, Persona, DataItem, Message } from "../types";

/**
 * Replace macros in text: {{user}}, {{char}}, etc.
 */
const replaceMacros = (text: string, persona: Persona, userReq: string = ""): string => {
  if (!text) return "";
  let processed = text;
  
  // {{user}} -> Assuming user is 'Master' or defined in settings, but for now we default to 'Master' or user's name if we had it.
  // In this app context, the User plays the Protagonist role defined in Persona.
  processed = processed.replace(/{{user}}/gi, persona.name || "User");
  processed = processed.replace(/<user>/gi, persona.name || "User");
  
  // {{char}} -> The AI narrator/GM
  processed = processed.replace(/{{char}}/gi, "Tawa"); 
  processed = processed.replace(/<char>/gi, "Tawa");

  // Specific macros for input
  processed = processed.replace(/{{lastUserMessage}}/gi, userReq);
  
  // Common macros in Tawa preset
  processed = processed.replace(/{{charIfNotGroup}}/gi, "Tawa");
  
  return processed;
};

/**
 * Convert World Info to XML string
 */
const formatWorldInfo = (wi: WorldInfo): string => {
  return `
<world_setting>
  <genre>${wi.genre}</genre>
  <world_name>${wi.worldName}</world_name>
  <context>${wi.worldContext}</context>
</world_setting>
<npcs>
  ${wi.npcs.map(npc => `<npc name="${npc.name}">${npc.description}</npc>`).join('\n')}
</npcs>
<entities>
  ${wi.entities.map(ent => `<entity name="${ent.name}">${ent.description}</entity>`).join('\n')}
</entities>
  `.trim();
};

/**
 * Convert Persona to XML string
 */
const formatPersona = (p: Persona): string => {
  return `
<user_info>
  <name>${p.name}</name>
  <age>${p.age}</age>
  <gender>${p.gender}</gender>
  <personality>${p.personality}</personality>
  <background>${p.background}</background>
  <appearance>${p.appearance}</appearance>
  <skills>
    ${p.skills.map(s => `<skill name="${s.name}">${s.description}</skill>`).join('\n')}
  </skills>
  <goals>${p.goals}</goals>
  <hobbies>${p.hobbies}</hobbies>
</user_info>
  `.trim();
};

/**
 * Format Chat History
 * Taking the last N messages to fit context.
 */
const formatChatHistory = (messages: Message[], limit: number = 20): string => {
  // Take last 'limit' messages, excluding the very last user message (which is treated as input)
  const history = messages.slice(-limit); 
  
  return history.map(m => {
    const role = m.role === 'user' ? 'Master' : 'Tawa'; // Tawa preset conventions
    return `${role}: ${m.content}`;
  }).join('\n\n');
};

/**
 * CORE ENGINE: Construct the final prompt string from the Preset and Session Data.
 * Mimics PromptManager.js logic by iterating order and assembling.
 */
export const constructDynamicPrompt = (
  session: GameSession,
  currentUserInput: string
): string => {
  const { activePreset, persona, worldInfo, messages } = session;

  if (!activePreset) {
    // Fallback if no preset
    return `
    ${formatWorldInfo(worldInfo)}
    ${formatPersona(persona)}
    
    Lịch sử trò chuyện:
    ${formatChatHistory(messages)}
    
    User: ${currentUserInput}
    AI: 
    `;
  }

  // Flatten prompt_order. In the JSON provided, prompt_order is an array of objects wrapping an order array.
  // We need to handle both flat arrays and nested "character_id" structures found in ST presets.
  let orderList: { identifier: string; enabled: boolean }[] = [];
  
  if (Array.isArray(activePreset.prompt_order)) {
    // Check if it's the nested structure
    const firstItem = activePreset.prompt_order[0] as any;
    if (firstItem && 'order' in firstItem && Array.isArray(firstItem.order)) {
        // Just take the first available order list (simplified for single character mode)
        orderList = firstItem.order;
    } else {
        // It's a flat list
        orderList = activePreset.prompt_order;
    }
  }

  let finalPrompt = "";

  // Iterate through the order
  for (const item of orderList) {
    if (!item.enabled) continue;

    // Find the prompt definition
    const promptDef = activePreset.prompts.find(p => p.identifier === item.identifier);
    
    // Special Identifiers logic
    if (item.identifier === 'chatHistory') {
      finalPrompt += `\n<chathistory>\n${formatChatHistory(messages)}\n</chathistory>\n`;
      continue;
    }

    if (item.identifier === 'worldInfoBefore' || item.identifier === 'worldInfoAfter') {
       // We inject our dynamic World Info here
       // In Tawa preset, these are placeholders for external WI. We fill them with our data.
       finalPrompt += `\n<worldinfo>\n${formatWorldInfo(worldInfo)}\n${formatPersona(persona)}\n</worldinfo>\n`;
       continue;
    }
    
    // Standard Prompts
    if (promptDef && promptDef.content) {
      let content = replaceMacros(promptDef.content, persona, currentUserInput);
      finalPrompt += `\n${content}\n`;
    }
  }

  // Finally, append the User Input if the preset doesn't explicitly handle it via a macro in the loop
  // Tawa preset handles {{lastUserMessage}} inside specific prompts. 
  // We need to check if {{lastUserMessage}} was replaced. If not, append input at end.
  const hasInputMacro = activePreset.prompts.some(p => p.content.includes('{{lastUserMessage}}') && orderList.find(o => o.identifier === p.identifier)?.enabled);

  if (!hasInputMacro) {
      finalPrompt += `\nMaster: ${currentUserInput}\nTawa:`;
  }

  return finalPrompt;
};