let currentChatId = null;
let sidebarExpanded = false;
function sendSampleQuestion(element) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      document.getElementById("sampleQuestions").remove();
    });
  } else {
    document.getElementById("sampleQuestions").remove();
  }

  const question = element.textContent;

  document.getElementById("questionInput").value = question;
  sendMessage();
}

function getChatHistory() {
  fetch("/chats")
    .then((response) => response.json())
    .then((data) => {
      const chatHistoryHtml = data
        .map(
          (chat) => `
                    <div class="chat-message-content forhistory">
                        <button class="btna text-left btn btn-ghost p-4 chathistorybtn" onclick="getChat('${
                          chat._id
                        }'),toggleSidebar()">${
            chat.title.slice(0, 16) + "..."
          }</button>
                        <button class="btnb btn btn-ghost btn-circle" onclick="deleteChat('${
                          chat._id
                        }')">×</button>
                    </div>
                `
        )
        .join("");
      document.getElementById("chatHistory").innerHTML = chatHistoryHtml;
      document.getElementById("chatHistory").style = "";
    });
}

function getChat(chatId) {
  currentChatId = chatId;
  fetch(`/chat?chat_id=${chatId}&here=true`)
    .then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(error.error || "An error occurred");
        });
      }
      return response.json();
    })
    .then((data) => {
      history.replaceState(null, "", `/chat?chat_id=${chatId}`);
      const chatMessagesHtml = data
        .map((message) =>
          createMessageElement(
            message.content,
            message.role === "user"
          )
        )
        .join("");
      document.getElementById("chatMessages").scrollTop =
        document.getElementById("chatMessages").scrollHeight;
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          document.getElementById("chatMessages").innerHTML = chatMessagesHtml;
          flag();
          setTimeout(() => {
            document.getElementById("chatMessages").scrollTop =
              document.getElementById("chatMessages").scrollHeight;
          }, 500);
        });
      } else {
        document.getElementById("chatMessages").innerHTML = chatMessagesHtml;
        flag();
        setTimeout(() => {
          document.getElementById("chatMessages").scrollTop =
            document.getElementById("chatMessages").scrollHeight;
        }, 500);
      }
    })
    .catch((error) => {
      console.error(error);
      displayErrorMessage(error.message);
    });
}

function displayErrorMessage(message) {
  const errorElement = document.getElementById("error");
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function createMessageElement(message, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message mb-2 ${
    isUser ? "chat-end" : "chat-start"
  }`;

  const chatBubble = document.createElement("div");
  chatBubble.className = `chat-bubble ${
    isUser ? "user" : "bot"
  } rounded-lg shadow-md p-2`;

  if (isUser) {
    chatBubble.textContent = message;
  } else {
    chatBubble.innerHTML = message.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  }

  // Append the chat bubble and tail to the message div
  messageDiv.appendChild(chatBubble);
  const bubbleTail = document.createElement("div");
  bubbleTail.className = "chat-bubble-tail";
  messageDiv.appendChild(bubbleTail);

  // Scroll to the bottom of the chat messages container
  const chatMessagesContainer = document.getElementById("chatMessages");
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

  return messageDiv.outerHTML;
}

function popUpMessage(message, isUser) {
  console.log(currentChatId);
  if (!currentChatId) {
    document.getElementById("sampleQuestions")
      ? (document.getElementById("sampleQuestions").style.display = "flex")
      : null;
  } else {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        document.getElementById("sampleQuestions").remove();
      });
    } else {
      document.getElementById("sampleQuestions").remove();
    }
  }

  const messageElement = createMessageElement(message, isUser);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = messageElement;
  const messageDiv = tempDiv.firstChild;

  const chatMessages = document.getElementById("chatMessages");
  const prevScrollHeight = chatMessages.scrollHeight;

  messageDiv.style.opacity = "0";
  messageDiv.style.transform = "translateY(100%)";
  chatMessages.appendChild(messageDiv);

  if (document.startViewTransition) {
    document
      .startViewTransition(() => {
        messageDiv.style.opacity = "1";
        messageDiv.style.transform = "translateY(0)";
        chatMessages.scrollTop = chatMessages.scrollHeight;
      })
      .finished.then(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
  } else {
    requestAnimationFrame(() => {
      messageDiv.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      messageDiv.style.opacity = "1";
      messageDiv.style.transform = "translateY(0)";
    });

    messageDiv.addEventListener(
      "transitionend",
      () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      },
      { once: true }
    );

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
function takedown(data) {
  const par = document.querySelector("#chatMessages");
  let rejected = false;
  if (
    data ===
      "I’m sorry, but I’m unable to assist with that request out of respect for religious beliefs. If there’s anything else you’d like to ask, I’m here to help." ||
    data.includes("$!<alert>!$")
  ) {
    rejected = true;
  } else {
    rejected = false;
  }

  if (document.startViewTransition) {
    document
      .startViewTransition(() => {
        par.lastElementChild.querySelector(".chat-bubble").innerHTML =
          data.replace("$!<alert>!$", "") +
          '<div class="chat-bubble-tail"></div>';
        par
          .querySelectorAll(".chat-bubble")
          [par.querySelectorAll(".chat-bubble").length - 2].classList.add(
            rejected ? "un_accepeted" : "_i"
          );
        document.getElementById("chatMessages").scrollTop =
          document.getElementById("chatMessages").scrollHeight;
      })
      .finished.then(() => {
        return;
      });
  } else {
    par.lastElementChild.innerHTML = data;
  }
}
function flag() {
  const par = document.querySelector("#chatMessages");
  const li = par.querySelectorAll(".chat-bubble");

  li.forEach((element, index) => {
    const data = element.innerHTML;
    let rejected = false;

    if (
      data.includes(
        "I’m sorry, but I’m unable to assist with that request out of respect for religious beliefs. If there’s anything else you’d like to ask, I’m here to help."
      ) ||
      data.includes("$!<alert>!$")
    ) {
      rejected = true;
    } else {
      rejected = false;
    }

    if (index % 2 !== 0) {
      li[index - 1].classList.add(rejected ? "un_accepeted" : "_i");
      li[index].innerHTML = li[index].innerHTML.replace("$!<alert>!$", "");
    }
  });
}

function sendMessage() {
  if (!currentChatId) {
    document.getElementById("sampleQuestions")
      ? (document.getElementById("sampleQuestions").style.display = "flex")
      : null;
  } else {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        document.getElementById("sampleQuestions").remove();
      });
    } else {
      document.getElementById("sampleQuestions").remove();
    }
  }
  const questionInput = document.getElementById("questionInput");
  const question = questionInput.value.trim();

  if (question) {
    questionInput.value = "";
    questionInput.disabled = true;
    questionInput.style.opacity = "0.8";
    questionInput.style.pointerEvents = "not-allowed";
    popUpMessage(question, true);
    popUpMessage(
      "<div class='loader'><div class='box'></div><div class='box'></div><div class='box'></div><div class='box'></div></div>",
      false
    );

    fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, chat_id: currentChatId }),
    })
      .then((response) => response.json())
      .then((data) => {
        currentChatId = data.chat_id;
        history.replaceState(null, "", `/chat?chat_id=${currentChatId}`);
        if (document.startViewTransition) {
          document.startViewTransition(() => {
            document.getElementById("sampleQuestions")?.remove();
          });
        } else {
          document.getElementById("sampleQuestions")?.remove();
        }
        questionInput.disabled = false;
        questionInput.style.opacity = "1";
        questionInput.style.pointerEvents = "all";
        questionInput.focus();
        takedown(
          data.answer
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
            .replace(/(\s\d+\.)/g, "<br>$1")
        );

        getChatHistory();
      });
  }
}

function deleteChat(chatId) {
  const modal = document.getElementById("modal-container");
  modal.querySelector("h3").textContent = "Delete Chat";
  modal.querySelector("p").textContent =
    "Are you sure you want to delete this chat?";
  modal.querySelector("#confirm-delete-btn").textContent = "Delete";
  modal.querySelector("#confirm-delete-btn").onclick = () => {
    fetch("/delete_chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    })
      .then((response) => response.json())
      .then(() => {
        getChatHistory();
        if (currentChatId === chatId) {
          currentChatId = null;
          document.getElementById("chatMessages").innerHTML = "";
          window.location.href = "/";
        }
        closeModal();
      });
  };
  document.getElementById("modal-toggle").checked = true;
}

function deleteAllChats() {
  const modal = document.getElementById("modal-container");
  modal.querySelector("h3").textContent = "Delete All Chats";
  modal.querySelector("p").textContent =
    "Are you sure you want to delete all chats?";
  modal.querySelector("#confirm-delete-btn").textContent = "Delete All";
  modal.querySelector("#confirm-delete-btn").onclick = () => {
    fetch("/delete_all_chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then(() => {
        window.location.href = "/";
      });
  };
  document.getElementById("modal-toggle").checked = true;
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const chatArea = document.getElementById("chat-area");
  sidebarExpanded = !sidebarExpanded;
  if (sidebarExpanded) {
    sidebar.classList.add("open");
    chatArea.classList.add("sidebar-overlay");
  } else {
    sidebar.classList.remove("open");
    chatArea.classList.remove("sidebar-overlay");
  }
}

function closeModal() {
  document.getElementById("modal-toggle").checked = false;
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("newChatBtn").addEventListener("click", () => {
    window.location.href = "/";
  });

  document.getElementById("sendBtn").addEventListener("click", sendMessage);

  document.getElementById("questionInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  document
    .getElementById("deleteAllChatsBtn")
    .addEventListener("click", deleteAllChats);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    window.location.href = "/logout";
  });
  if (!currentChatId) {
    document.getElementById("sampleQuestions")
      ? (document.getElementById("sampleQuestions").style.display = "flex")
      : null;
  } else {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        document.getElementById("sampleQuestions").remove();
      });
    } else {
      document.getElementById("sampleQuestions").remove();
    }
  }
  getChatHistory();
});
function handleResize() {
  const sidebar = document.getElementById("sidebar");
  const chatArea = document.getElementById("chat-area");
  if (window.innerWidth > 768) {
    sidebar.classList.remove("open");
    chatArea.classList.remove("sidebar-overlay");
    sidebarExpanded = false;
  }
}

window.addEventListener("resize", handleResize);

document.addEventListener("DOMContentLoaded", function () {
  handleResize();
});


