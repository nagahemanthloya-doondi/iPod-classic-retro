
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

// Game constants
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 8;
const PADDLE_Y_OFFSET = 20;
const PADDLE_STEP = 15;
const BALL_RADIUS = 5;
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 9;
const BRICK_WIDTH = 32;
const BRICK_HEIGHT = 12;
const BRICK_PADDING = 3;
const BRICK_OFFSET_TOP = 20;
const BRICK_OFFSET_LEFT = 14;

interface Brick {
    x: number;
    y: number;
    status: 1 | 0;
}

interface GameState {
    paddleX: number;
    ball: { x: number; y: number; dx: number; dy: number };
    bricks: Brick[][];
    score: number;
    lives: number;
    isStarted: boolean;
    isPaused: boolean;
    gameOver: boolean;
    gameWon: boolean;
}

interface BrickBreakerProps {
    goBack: () => void;
}

const BrickBreaker = forwardRef<{ movePaddle: (dir: 'left' | 'right') => void; startGame: () => void; }, BrickBreakerProps>(({ goBack }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number>();
    const gameStateRef = useRef<GameState | null>(null);

    // Fix: Refactor resetBallAndPaddle to not take arguments and use the ref directly.
    const resetBallAndPaddle = () => {
        if (!gameStateRef.current || !canvasRef.current) return;
        const state = gameStateRef.current;
        const canvas = canvasRef.current;
        state.ball.x = canvas.width / 2;
        state.ball.y = canvas.height - PADDLE_Y_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 1;
        state.ball.dx = 2;
        state.ball.dy = -2;
        state.paddleX = (canvas.width - PADDLE_WIDTH) / 2;
    };
    
    // Fix: Refactor initializeGameState to set initial state directly, avoiding the problematic function call.
    const initializeGameState = (): GameState => {
        const canvas = canvasRef.current!;
        const bricks: Brick[][] = [];
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            bricks[c] = [];
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
        const state: GameState = {
            paddleX: (canvas.width - PADDLE_WIDTH) / 2,
            ball: { 
                x: canvas.width / 2, 
                y: canvas.height - PADDLE_Y_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 1,
                dx: 2, 
                dy: -2 
            },
            bricks,
            score: 0,
            lives: 3,
            isStarted: false,
            isPaused: false,
            gameOver: false,
            gameWon: false,
        };
        return state;
    };
    
    useImperativeHandle(ref, () => ({
        movePaddle: (direction: 'left' | 'right') => {
            if (!gameStateRef.current || gameStateRef.current.isPaused || !gameStateRef.current.isStarted) return;
            const state = gameStateRef.current;
            const canvas = canvasRef.current!;
            if (direction === 'right') {
                state.paddleX = Math.min(state.paddleX + PADDLE_STEP, canvas.width - PADDLE_WIDTH);
            } else {
                state.paddleX = Math.max(state.paddleX - PADDLE_STEP, 0);
            }
        },
        startGame: () => {
            if (!gameStateRef.current) return;
            if (gameStateRef.current.gameOver || gameStateRef.current.gameWon) {
                gameStateRef.current = initializeGameState();
            }
            if (!gameStateRef.current.isStarted) {
                gameStateRef.current.isStarted = true;
            }
        }
    }));


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Set canvas dimensions based on rem units (approx 16px/rem)
        canvas.width = 20 * 16;
        canvas.height = 15 * 16;

        gameStateRef.current = initializeGameState();
        
        const drawPaddle = () => {
            const state = gameStateRef.current!;
            ctx.beginPath();
            ctx.rect(state.paddleX, canvas.height - PADDLE_Y_OFFSET - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
            ctx.fillStyle = "#374151"; // gray-700
            ctx.fill();
            ctx.closePath();
        };

        const drawBall = () => {
            const state = gameStateRef.current!;
            ctx.beginPath();
            ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = "#1f2937"; // gray-800
            ctx.fill();
            ctx.closePath();
        };
        
        const drawBricks = () => {
            const state = gameStateRef.current!;
            const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]; // red, orange, yellow, green, blue
            for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
                for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                    if (state.bricks[c][r].status === 1) {
                        const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
                        const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
                        state.bricks[c][r].x = brickX;
                        state.bricks[c][r].y = brickY;
                        ctx.beginPath();
                        ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                        ctx.fillStyle = colors[r % colors.length];
                        ctx.fill();
                        ctx.closePath();
                    }
                }
            }
        };

        const drawInfo = (text: string, subtext: string = "") => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "bold 24px sans-serif";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 10);
            if (subtext) {
                ctx.font = "16px sans-serif";
                ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 20);
            }
        };

        const collisionDetection = () => {
            const state = gameStateRef.current!;
            for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
                for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                    const b = state.bricks[c][r];
                    if (b.status === 1) {
                        if (state.ball.x > b.x && state.ball.x < b.x + BRICK_WIDTH && state.ball.y > b.y && state.ball.y < b.y + BRICK_HEIGHT) {
                            state.ball.dy = -state.ball.dy;
                            b.status = 0;
                            state.score++;
                            if (state.score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT) {
                                state.gameWon = true;
                            }
                        }
                    }
                }
            }
        };

        const draw = () => {
            const state = gameStateRef.current!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBricks();
            drawPaddle();
            drawBall();
            collisionDetection();
            
            // Score and Lives Text
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#1f2937';
            ctx.textAlign = 'left';
            ctx.fillText(`Score: ${state.score}`, 8, 14);
            ctx.textAlign = 'right';
            ctx.fillText(`Lives: ${state.lives}`, canvas.width - 8, 14);

            if (!state.isStarted) {
                drawInfo("Brick Breaker", "Press Center Button to Start");
                return;
            }
            
            if (state.gameOver) {
                drawInfo("GAME OVER", "Press Center Button to Restart");
                return;
            }

            if (state.gameWon) {
                drawInfo("YOU WIN!", "Press Center Button to Play Again");
                return;
            }

            // Ball movement
            if (state.ball.x + state.ball.dx > canvas.width - BALL_RADIUS || state.ball.x + state.ball.dx < BALL_RADIUS) {
                state.ball.dx = -state.ball.dx;
            }
            if (state.ball.y + state.ball.dy < BALL_RADIUS) {
                state.ball.dy = -state.ball.dy;
            } else if (state.ball.y + state.ball.dy > canvas.height - BALL_RADIUS - PADDLE_Y_OFFSET - PADDLE_HEIGHT) {
                if (state.ball.x > state.paddleX && state.ball.x < state.paddleX + PADDLE_WIDTH) {
                    state.ball.dy = -state.ball.dy;
                } else {
                    state.lives--;
                    if (state.lives <= 0) {
                        state.gameOver = true;
                    } else {
                        resetBallAndPaddle();
                    }
                }
            }

            state.ball.x += state.ball.dx;
            state.ball.y += state.ball.dy;
        };

        const gameLoop = () => {
            const state = gameStateRef.current!;
            if (state.isStarted && !state.gameOver && !state.gameWon) {
                draw();
            } else {
                draw(); // Draw the initial or end screen
            }
            animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, []);

    return (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <canvas ref={canvasRef} />
        </div>
    );
});

export default BrickBreaker;