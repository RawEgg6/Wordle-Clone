import { useState, useEffect, useRef } from "react";
import styles from "./Home.module.css";

function Home(){

    const inputRefs = useRef([]);
    const keyboardRefs = useRef({});
    let thresholdValueLower = 0
    let thresholdValueUpper = 4
    const currentIndex = useRef(0);
    const [notification, setNotification] = useState(null);
    
    // API Base URL - use environment variable or fallback to relative URL for production
    const API_BASE_URL = import.meta.env.VITE_REACT_BACKEND_BASEURL || '';

    const rows = [
        "qwertyuiop", // First row
        "asdfghjkl",  // Second row
        "zxcvbnm",    // Third row with Enter and Delete
      ]; 

    function showNotification(message, type = "error") {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000)
        return;
      }

    //This function handles input when key/keybutton is pressed
    //This took so long lmao
    function handleLetter(key){
        
        console.log(key, thresholdValueLower, currentIndex.current, thresholdValueUpper)
        if(key == "Enter" && currentIndex.current - 1 == thresholdValueUpper){
            let word = ""
            for(let i = thresholdValueLower ; i <= thresholdValueUpper; i++){
                word += inputRefs.current[i].innerHTML
            }
            
            handleWord(word)
            return;
        }

        else if(key == "Backspace" && currentIndex.current - 1 >= thresholdValueLower){
            console.log("here B")
            inputRefs.current[--currentIndex.current].innerHTML = ""
            
        }

        else if (currentIndex.current >= thresholdValueLower && currentIndex.current <= thresholdValueUpper && /^[a-z]$/.test(key.toLowerCase())){
            inputRefs.current[currentIndex.current].innerHTML = key;
            currentIndex.current++;
            return;
        }
    }
    
    //This funtion handles the css when we submit a word
    //shapes and colors make me go crazy
    function handleSubmission(answer) { 
        let count = 0;

        for(let i = thresholdValueLower; i <= thresholdValueUpper; i++){
            inputRefs.current[i].style.backgroundColor = "gray";
            if(keyboardRefs.current[inputRefs.current[i].innerHTML].style.color != "white"){
                keyboardRefs.current[inputRefs.current[i].innerHTML].style.backgroundColor = "gray";
                keyboardRefs.current[inputRefs.current[i].innerHTML].style.color = "white"
            }
        }
        for (const pos in answer) {
          if (answer[pos] === "correct") {
            inputRefs.current[thresholdValueLower + Number(pos)].style.backgroundColor = "seagreen";
            keyboardRefs.current[inputRefs.current[thresholdValueLower + Number(pos)].innerHTML].style.backgroundColor = "seagreen";
            keyboardRefs.current[inputRefs.current[thresholdValueLower + Number(pos)].innerHTML].style.color = "white"
            count++;
          } else if (answer[pos] === "position") {
            inputRefs.current[thresholdValueLower + Number(pos) ].style.backgroundColor = "#E49B0F";
            if(keyboardRefs.current[inputRefs.current[thresholdValueLower + Number(pos)].innerHTML].style.backgroundColor != "seagreen"){
                keyboardRefs.current[inputRefs.current[thresholdValueLower + Number(pos)].innerHTML].style.backgroundColor = "#E49B0F";
                keyboardRefs.current[inputRefs.current[thresholdValueLower + Number(pos)].innerHTML].style.color = "white"
            }

          }
        }
        if(count == 5){
            showNotification("Word found", "success");
            currentIndex.current = -1
        }

        else{
            thresholdValueLower += 5;
            thresholdValueUpper += 5

        }
        return;
    }

    //This sends a request to backend to check if a word is valid and returns a position array
    async function handleWord(word) {
        try{
            const response = await fetch(`${API_BASE_URL}/api/word`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({word})
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if(data.status === "success"){
                 if(data.wordFound === false){
                    showNotification("Word is not in library");
                } else {
                    handleSubmission(data.answer);
                }
            } else {
                showNotification(data.message || "Server error occurred");
            }
        } catch (error) {
            console.error("Error:", error);
            showNotification("Network error. Please check your connection and try again.");
        }
    }

    useEffect(() => {
        const handleKeyDown = (event) => {
            handleLetter(event.key)
        };
        
        currentIndex.current = 0;
        console.log("Effect running, currentIndex:", currentIndex.current)
        
        window.addEventListener("keydown", handleKeyDown);

        // Keep warm interval
        const keepWarm = setInterval(async () => {
            try {
                await fetch(`${API_BASE_URL}/api/health`); // or any lightweight endpoint
            } catch (error) {
                // Ignore errors, just trying to keep warm
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Single cleanup function that handles both
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            clearInterval(keepWarm);
        };
    }, []);
      
    
    return(
        <div>
        <header className={styles.header}>
            <a href="/" className={styles.logo}>Wordle</a>
            
            <nav className={styles.navbar}>
                <a href="/">Help</a>
                <a href="/">Login</a>
            </nav>
        </header>
        {notification && (
            <div
            className={`${styles.notification} ${
                notification.type === "success" ? styles.success : styles.error
            }`}
            >
            {notification.message}
            </div>
            )}
        <div className={styles.wordArea} >
            {Array(6) 
                .fill("")
                .map((_, rowIndex) => (
                <div className={styles.wordRow} key={rowIndex}>
                    {Array(5)
                    .fill("")
                    .map((_, colIndex) => {
                        const inputIndex = rowIndex * 5 + colIndex; 
                        return (
                        <div className={styles.wordBox} key={colIndex} ref={(el) => (inputRefs.current[inputIndex] = el)} >
                            
                        </div>
                        );
                    })}
                </div>
                ))}

            <div className={styles.keyboard}>
            {rows.map((row, rowIndex) => (
                
                <div key={rowIndex} className={styles.keyboardRow}>
                {rowIndex === 2 && (
                    <>
                    <button className={styles.specialKeyStyle} onClick={() => handleLetter("Enter")}>Enter</button>

                    {[...row].map((key, keyIndex) => (
                        <button key={key} className={styles.keyStyle} onClick={() => handleLetter(key)} ref={(el) => (keyboardRefs.current[key] = el)}>{key.toUpperCase()}</button>
                    ))}

                    <button className={styles.specialKeyStyle} onClick={() => handleLetter("Backspace")}>Delete</button>
                    </>
                )}
                {rowIndex !== 2 &&
                    [...row].map((key, keyIndex) => (
                    <button key={key} className={styles.keyStyle} onClick={() => handleLetter(key)} ref={(el) => (keyboardRefs.current[key] = el)}>{key.toUpperCase()}</button>
                    ))}
                </div>
            ))}
            </div>
        </div>
        
        </div>
    )
}

export default Home