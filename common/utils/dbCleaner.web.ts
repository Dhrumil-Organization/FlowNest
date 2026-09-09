export const clearAllMasterDatabases=async()=>{try{localStorage.removeItem('FlowNestWebCache');return true}catch{return false}};
export const clearAllChatDatabases=async()=>{try{localStorage.removeItem('FlowNestWebChats');return true}catch{return false}};
export const clearAllAppDatabases=async()=>{try{localStorage.removeItem('FlowNestWebChats');return true}catch{return false}};
