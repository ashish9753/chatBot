document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatBody = document.querySelector(".chat-body");
    const messageInput = document.querySelector(".message-input");
    const sendMessageButton = document.querySelector("#send-message");
    const fileInput = document.querySelector("#file-input");
    const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
    const fileCancelButton = document.querySelector("#file-cancel");
    const chatbotToggler = document.querySelector("#chatbot-toggler");
    const closeChatbot = document.querySelector("#close-chatbot");
    const emojiPickerButton = document.querySelector("#emoji-picker");
    const fileUploadButton = document.querySelector("#file-upload");

    // API Configuration
    const API_KEY = "AIzaSyBsZrZLwvQSjZgmukPdURAcNRKjmx9GScA";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    // Data Structures
    const userData = {
        message: null,
        file: { data: null, mime_type: null }
    };

    const chatHistory = [];
    const conversationHistory = [];
    let lastUploadFile = null;
    const initialInputHeight = messageInput.scrollHeight;

    // Helper Functions
    const createMessageElement = (content, ...classes) => {
        const div = document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML = content;
        return div;
    };

    // API Functions
    const generateBotResponse = async (incomingMessageDiv) => {
        const messageElement = incomingMessageDiv.querySelector(".message-text");

        chatHistory.push({
            role: "user",
            parts: [
                { text: userData.message },
                ...(userData.file?.data ? [{ inline_data: userData.file }] : [])
            ]
        });

        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        };

        try {
            const response = await fetch(API_URL, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();

            const botMessage = data.candidates?.[0]?.content?.parts?.[0]?.text
                ?.replace(/[`*]/g, "")
                .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                .replace(/\*(.*?)\*/g, "<i>$1</i>")
                .replace(/\n/g, "<br>")
                .trim() || "Sorry, I couldn't understand that.";

            chatHistory.push({
                role: "model",
                parts: [{ text: botMessage }]
            });

            conversationHistory.push({ 
                role: "bot", 
                text: botMessage, 
                file: userData.file?.data ? { ...userData.file } : null 
            });

            messageElement.innerHTML = botMessage;
        } catch (error) {
            console.error(error);
            messageElement.innerText = `Error: ${error.message}`;
            incomingMessageDiv.classList.add("error");
        } finally {
            userData.file = { data: null, mime_type: null };
            incomingMessageDiv.classList.remove("thinking");
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        }
    };

    // Event Handlers
    const handleOutgoingMessage = (e) => {
        e.preventDefault();
        const userMessage = messageInput?.value.trim();
        if (!userMessage) return;

        fileUploadWrapper.classList.remove("file-uploaded");
        userData.message = userMessage;
        messageInput.dispatchEvent(new Event("input"));

        if (!userData.file?.data) {
            const lastImageMessage = [...(conversationHistory || [])]
                .reverse()
                .find(message => message.file && message.file.data);

            if (lastImageMessage) {
                userData.file = lastImageMessage.file;
            } else if (lastUploadFile) {
                userData.file = lastUploadFile;
                lastUploadFile = null;
            }
        }

        const messageContent = `
            <div class="message-text">${userData.message}</div>
            ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment"/>` : ""}
        `;

        const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
        chatBody.appendChild(outgoingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        messageInput.value = "";
        messageInput.focus();

        setTimeout(() => {
            const thinkingMessageContent = `
                <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"></path>
                </svg>
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>`;

            const incomingMessageDiv = createMessageElement(thinkingMessageContent, "bot-message", "thinking");
            chatBody.appendChild(incomingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

            generateBotResponse(incomingMessageDiv);
        }, 600);
    };

    // Event Listeners
    messageInput.addEventListener("keydown", (e) => {
        const userMessage = e.target.value.trim();
        if (e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 786) {
            handleOutgoingMessage(e);
        }
    });

    messageInput.addEventListener("input", () => {
        messageInput.style.height = `${initialInputHeight}px`;
        messageInput.style.height = `${messageInput.scrollHeight}px`;
        document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
    });

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            fileUploadWrapper.querySelector("img").src = e.target.result;
            fileUploadWrapper.classList.add("file-uploaded");
            const base64String = e.target.result.split(",")[1];

            userData.file = {
                data: base64String,
                mime_type: file.type
            };
            fileInput.value = "";
        };
        reader.readAsDataURL(file);
    });

    fileCancelButton.addEventListener("click", () => {
        userData.file = { data: null, mime_type: null };
        fileUploadWrapper.classList.remove("file-uploaded");
    });

    sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
    fileUploadButton.addEventListener("click", () => fileInput.click());
    chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
    closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));

    // Emoji Picker
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'emoji-picker-container';
    document.body.appendChild(pickerContainer);

    emojiPickerButton.addEventListener('click', function() {
        if (pickerContainer.children.length === 0) {
            const picker = new EmojiMart.Picker({
                onEmojiSelect: (emoji) => {
                    messageInput.value += emoji.native;
                    pickerContainer.innerHTML = '';
                },
                data: async () => {
                    const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
                    return response.json();
                }
            });
            
            pickerContainer.appendChild(picker);
        } else {
            pickerContainer.innerHTML = '';
        }
    });

    document.addEventListener('click', function(e) {
        if (!emojiPickerButton.contains(e.target)) {
            pickerContainer.innerHTML = '';
        }
    });
});

// Add this code to your existing script.js file
document.addEventListener('DOMContentLoaded', function() {
    // Get reference to the header AI Assistant buttons
    const headerAIButton = document.querySelector('.bg-red-600.hidden.md\\:block');
    const mobileAIButton = document.querySelector('.bg-red-600.hover\\:bg-red-700.text-white.px-4.py-2.rounded-full.font-medium.transition.duration-300.mt-2');
    
    // Get reference to cuisine links in the footer
    const cuisineLinks = document.querySelectorAll('footer a.text-gray-400.hover\\:text-white.transition');
    
    // Function to open chatbot and set a prompt
    function openChatbotWithPrompt(prompt) {
        // Open the chatbot
        document.body.classList.add('show-chatbot');
        
        // Set the text in the message input
        const messageInput = document.querySelector('.message-input');
        if (messageInput) {
            messageInput.value = prompt;
            messageInput.dispatchEvent(new Event('input')); // Trigger input event to resize textarea
            
            // Optionally auto-send the message
            // setTimeout(() => {
            //     document.querySelector('#send-message').click();
            // }, 500);
        }
    }
    
    // Add event listeners to header AI buttons
    if (headerAIButton) {
        headerAIButton.addEventListener('click', function() {
            document.body.classList.add('show-chatbot');
        });
    }
    
    if (mobileAIButton) {
        mobileAIButton.addEventListener('click', function() {
            document.body.classList.add('show-chatbot');
        });
    }
    
    // Add click event listeners to cuisine links in footer
    cuisineLinks.forEach(link => {
        const cuisineType = link.textContent.trim();
        
        // Only attach to the cuisine types we're interested in
        if (['Italian', 'Mexican', 'Japanese', 'Indian'].includes(cuisineType)) {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default link behavior
                
                // Create appropriate prompts based on cuisine type
                let prompt = '';
                switch (cuisineType) {
                    case 'Italian':
                        prompt = "Tell me about authentic Italian cuisine and recommend some traditional dishes I should try.";
                        break;
                    case 'Mexican':
                        prompt = "What are the best traditional Mexican dishes and where can I typically find them?";
                        break;
                    case 'Japanese':
                        prompt = "I'm interested in exploring Japanese cuisine. What authentic dishes should I try?";
                        break;
                    case 'Indian':
                        prompt = "Could you recommend some regional Indian dishes that represent authentic Indian cuisine?";
                        break;
                    default:
                        prompt = `Tell me about ${cuisineType} cuisine and popular dishes.`;
                }
                
                openChatbotWithPrompt(prompt);
            });
        }
    });
    
    // Also attach to the "Explore Cuisines" button in hero section
    const exploreCuisinesButton = document.querySelector('.bg-red-500.hover\\:bg-red-600.text-white.font-bold.py-3.px-6.rounded-full');
    if (exploreCuisinesButton) {
        exploreCuisinesButton.addEventListener('click', function() {
            openChatbotWithPrompt("What are some popular local cuisines around the world that I should know about?");
        });
    }
});