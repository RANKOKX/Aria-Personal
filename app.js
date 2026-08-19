// ════════════════════════════════════════════════════════════════
//  FIREBASE CONFIG — À REMPLACER PAR TES IDENTIFIANTS
// ════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCDqK2xB0_xxxxxxxxxxxxxxxXXXXXXX", // ← REMPLACE
  authDomain: "aria-personal-xxxxx.firebaseapp.com",
  projectId: "aria-personal-xxxxx",
  storageBucket: "aria-personal-xxxxx.appspot.com",
  messagingSenderId: "xxxxxxxxx",
  appId: "1:xxxxxxxxx:web:xxxxxxxxxxxx"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ════════════════════════════════════════════════════════════════
//  ÉTAT GLOBAL
// ════════════════════════════════════════════════════════════════
let currentUser = null;
let userProfile = null;
let conversationHistory = [];
let userKnowledge = {}; // Profil appris

// ════════════════════════════════════════════════════════════════
//  AUTH LISTENERS
// ════════════════════════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("user-email").textContent = user.email;
    
    // Charger le profil utilisateur et historique
    await loadUserProfile();
    await loadConversationHistory();
    
    // Afficher app screen
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("app-screen").classList.add("active");
    
    // Focus input
    document.getElementById("message-input").focus();
  } else {
    currentUser = null;
    document.getElementById("auth-screen").classList.add("active");
    document.getElementById("app-screen").classList.remove("active");
  }
});

// ════════════════════════════════════════════════════════════════
//  GOOGLE LOGIN
// ════════════════════════════════════════════════════════════════
document.getElementById("google-login").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    // User stored in onAuthStateChanged listener
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    alert("Erreur: " + error.message);
  }
});

// ════════════════════════════════════════════════════════════════
//  LOGOUT
// ════════════════════════════════════════════════════════════════
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
  }
});

// ════════════════════════════════════════════════════════════════
//  FIRESTORE FUNCTIONS
// ════════════════════════════════════════════════════════════════
async function loadUserProfile() {
  if (!currentUser) return;
  
  const docRef = doc(db, "users", currentUser.uid);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      userProfile = docSnap.data();
      userKnowledge = userProfile.knowledge || {};
    } else {
      // Créer le profil
      userProfile = {
        email: currentUser.email,
        createdAt: new Date().toISOString(),
        knowledge: {},
        conversationCount: 0,
        preferences: {}
      };
      await setDoc(docRef, userProfile);
    }
  } catch (error) {
    console.error("Erreur chargement profil:", error);
  }
}

async function loadConversationHistory() {
  if (!currentUser) return;
  
  const q = query(
    collection(db, "conversations"),
    where("userId", "==", currentUser.uid),
    orderBy("timestamp", "asc")
  );
  
  try {
    onSnapshot(q, (snapshot) => {
      conversationHistory = [];
      snapshot.forEach((doc) => {
        conversationHistory.push(doc.data());
      });
      
      // Afficher l'historique
      document.getElementById("chat").innerHTML = "";
      conversationHistory.forEach((msg) => {
        displayMessage(msg.text, msg.sender);
      });
      
      // Scroll en bas
      setTimeout(() => {
        document.querySelector(".chat-container").scrollTop = 
          document.querySelector(".chat-container").scrollHeight;
      }, 50);
    });
  } catch (error) {
    console.error("Erreur chargement historique:", error);
  }
}

async function saveMessage(text, sender) {
  if (!currentUser) return;
  
  try {
    await addDoc(collection(db, "conversations"), {
      userId: currentUser.uid,
      text: text,
      sender: sender,
      timestamp: new Date(),
    });
    
    // Mettre à jour le compte
    if (sender === "user" && userProfile) {
      userProfile.conversationCount = (userProfile.conversationCount || 0) + 1;
      await setDoc(doc(db, "users", currentUser.uid), userProfile);
    }
  } catch (error) {
    console.error("Erreur sauvegarde message:", error);
  }
}

async function updateUserKnowledge(key, value) {
  if (!currentUser || !userProfile) return;
  
  try {
    userProfile.knowledge = userProfile.knowledge || {};
    userProfile.knowledge[key] = value;
    userKnowledge[key] = value;
    
    await setDoc(doc(db, "users", currentUser.uid), userProfile);
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
  }
}

// ════════════════════════════════════════════════════════════════
//  CHAT FUNCTIONS
// ════════════════════════════════════════════════════════════════
function displayMessage(text, sender) {
  const chatEl = document.getElementById("chat");
  const msgEl = document.createElement("div");
  msgEl.className = `msg ${sender}`;
  
  const avatarEl = document.createElement("div");
  avatarEl.className = "avatar";
  avatarEl.textContent = sender === "bot" ? "AI" : "TU";
  
  const bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble";
  bubbleEl.innerHTML = text;
  
  msgEl.appendChild(avatarEl);
  msgEl.appendChild(bubbleEl);
  chatEl.appendChild(msgEl);
  
  // Scroll
  document.querySelector(".chat-container").scrollTop = 
    document.querySelector(".chat-container").scrollHeight;
}

function showTyping() {
  document.getElementById("typing").classList.remove("hidden");
}

function hideTyping() {
  document.getElementById("typing").classList.add("hidden");
}

// ════════════════════════════════════════════════════════════════
//  IA RESPONSE ENGINE
// ════════════════════════════════════════════════════════════════
async function getAIResponse(userInput) {
  const input = userInput.toLowerCase().trim();
  
  // Greetings
  if (/^(bonjour|salut|hello|hey|coucou)/.test(input)) {
    return `Salut ! Je suis ARIA, votre IA personnelle. Je vais apprendre à vous connaître au fil de nos conversations. Que puis-je faire pour vous ?`;
  }
  
  // Time
  if (/heure|time|quelle heure/.test(input)) {
    const now = new Date().toLocaleTimeString("fr-FR");
    return `Il est actuellement <strong>${now}</strong>.`;
  }
  
  // Date
  if (/date|jour|aujourd/.test(input)) {
    const now = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return `Nous sommes le <strong>${now}</strong>.`;
  }
  
  // Learn about user
  if (/qui suis-je|parle-moi de moi|mon profil/.test(input)) {
    if (Object.keys(userKnowledge).length === 0) {
      return `Je ne vous connais pas encore ! Parlez-moi de vous — votre nom, vos intérêts, ce que vous aimez. Je vais apprendre progressivement. 📚`;
    }
    
    let profile = `Voici ce que j'ai appris sur vous :\n\n`;
    for (const [key, value] of Object.entries(userKnowledge)) {
      profile += `• <strong>${key}</strong>: ${value}\n`;
    }
    return profile;
  }
  
  // Me getting to know the user
  if (/je m'appelle|mon nom est|je suis|j'aime|je fais|j'habite/.test(input)) {
    // Extract and store
    if (/je m'appelle|mon nom est/.test(input)) {
      const name = input.replace(/^.*(je m'appelle|mon nom est)\s+/i, "").split(/[.!?]/)[0].trim();
      if (name) {
        await updateUserKnowledge("nom", name);
        return `Enchanté, <strong>${name}</strong> ! Je me souviendrai de votre nom. 😊`;
      }
    }
    
    if (/j'aime|j'adore/.test(input)) {
      const interest = input.replace(/^.*(j'aime|j'adore)\s+/i, "").split(/[.!?]/)[0].trim();
      if (interest) {
        const interests = userKnowledge.intérêts ? userKnowledge.intérêts + ", " + interest : interest;
        await updateUserKnowledge("intérêts", interests);
        return `Super ! <strong>${interest}</strong> — noté ! Je vais me souvenir de vos intérêts.`;
      }
    }
    
    return `D'accord, je note ça. Parlez-moi plus en détail !`;
  }
  
  // Math
  const mathMatch = input.match(/(\d+)\s*[+\-*/]\s*(\d+)/);
  if (mathMatch) {
    const a = parseInt(mathMatch[1]);
    const b = parseInt(mathMatch[2]);
    let result;
    if (input.includes("+")) result = a + b;
    else if (input.includes("-")) result = a - b;
    else if (input.includes("*")) result = a * b;
    else if (input.includes("/")) result = (a / b).toFixed(2);
    return `<strong>${a}</strong> ${input.includes("+") ? "+" : input.includes("-") ? "-" : input.includes("*") ? "×" : "÷"} <strong>${b}</strong> = <strong>${result}</strong>`;
  }
  
  // Jokes
  if (/blague|joke|drole|rigolo/.test(input)) {
    const jokes = [
      "Pourquoi les plongeurs plongent toujours en arrière ? Sinon ils tombent dans le bateau ! 🚢",
      "Quel est le comble pour un électricien ? Ne pas être au courant ! ⚡",
      "Je connais une blague sur le vide... ... ... C'est vide. 🌌"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  // Help
  if (/help|aide|que peux|capacite/.test(input)) {
    return `Je peux :<br>
    • 💬 Discuter avec vous naturellement<br>
    • 📚 Apprendre vos préférences et vous connaître<br>
    • 🧮 Faire des calculs simples<br>
    • ⏰ Vous donner l'heure et la date<br>
    • 😄 Raconter des blagues<br>
    • 💾 Conserver l'historique de nos conversations<br><br>
    Parlons-nous ! Plus vous me parlerez, plus je vous connaîtrai.`;
  }
  
  // Default response
  return `Je ne suis pas certain de bien comprendre. Pouvez-vous reformuler ? Ou parlez-moi de vous pour que je vous connaisse mieux !`;
}

// ════════════════════════════════════════════════════════════════
//  SEND MESSAGE
// ════════════════════════════════════════════════════════════════
async function sendMessage() {
  const input = document.getElementById("message-input");
  const text = input.value.trim();
  
  if (!text) return;
  
  // Clear input
  input.value = "";
  
  // Display user message
  displayMessage(text, "user");
  await saveMessage(text, "user");
  
  // Show typing
  showTyping();
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Get response
  const response = await getAIResponse(text);
  hideTyping();
  
  // Display bot response
  displayMessage(response, "bot");
  await saveMessage(response, "bot");
  
  // Focus input
  input.focus();
}

// ════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ════════════════════════════════════════════════════════════════
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("message-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Quick action helper
function ask(question) {
  document.getElementById("message-input").value = question;
  sendMessage();
}
