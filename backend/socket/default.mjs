export const handler = async (event) => {
  console.log("Default route hit:", event);
  
  return {
    statusCode: 200,
    body: "Unknown action"
  };
};