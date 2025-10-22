// Game Data
const gameData = {
  scenarios: {
    level1: {
      processes: 2,
      resources: 3,
      max: [[7,5,3], [3,2,2]],
      allocation: [[0,1,0], [2,0,0]],
      available: [3,3,2],
      description: "Basic scenario with 2 processes and 3 resource types"
    },
    level2: {
      processes: 4,
      resources: 3,
      max: [[7,5,3], [3,2,2], [9,0,2], [2,2,2]],
      allocation: [[0,1,0], [2,0,0], [3,0,2], [2,1,1]],
      available: [3,3,2],
      description: "Intermediate scenario with 4 processes"
    }
  },
  gameSettings: {
    timerDuration: 60,
    pointsPerExecution: 100,
    timeBonus: 10,
    maxLevels: 5
  },
  tutorials: {
    bankerAlgorithm: "The Banker's Algorithm ensures the system never enters a deadlock state by checking if resource allocation leads to a safe sequence.",
    safetyCheck: "A safe state exists when there's an execution sequence allowing all processes to complete with available resources.",
    matrices: "Max shows maximum resources needed, Allocation shows current allocation, Need shows remaining requirements."
  }
};

// Game State
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentLevel = 1;
    this.score = 0;
    this.timeLeft = gameData.gameSettings.timerDuration;
    this.timerStarted = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.selectedProcess = null;
    this.completedProcesses = new Set();
    this.executionCount = 0;
    
    // System state
    this.processes = 0;
    this.resources = 0;
    this.max = [];
    this.allocation = [];
    this.need = [];
    this.available = [];
    this.safeSequence = [];
    this.isSafe = true;
    
    this.timerInterval = null;
  }
}

// Banker's Algorithm Implementation
class BankersAlgorithm {
  static calculateNeed(max, allocation) {
    const need = [];
    for (let i = 0; i < max.length; i++) {
      need[i] = [];
      for (let j = 0; j < max[i].length; j++) {
        need[i][j] = max[i][j] - allocation[i][j];
      }
    }
    return need;
  }

  static isSafeState(processes, resources, max, allocation, available) {
    const need = this.calculateNeed(max, allocation);
    const work = [...available];
    const finish = new Array(processes).fill(false);
    const safeSequence = [];

    let found = true;
    while (found && safeSequence.length < processes) {
      found = false;
      
      for (let i = 0; i < processes; i++) {
        if (!finish[i] && this.canAllocate(need[i], work)) {
          // Add allocated resources back to work
          for (let j = 0; j < resources; j++) {
            work[j] += allocation[i][j];
          }
          finish[i] = true;
          safeSequence.push(i);
          found = true;
          break;
        }
      }
    }

    return {
      isSafe: safeSequence.length === processes,
      safeSequence: safeSequence.length === processes ? safeSequence : []
    };
  }

  static canAllocate(need, available) {
    for (let i = 0; i < need.length; i++) {
      if (need[i] > available[i]) {
        return false;
      }
    }
    return true;
  }

  static canExecuteProcess(processId, need, available) {
    return this.canAllocate(need[processId], available);
  }
}

// Game Controller
class GameController {
  constructor() {
    this.gameState = new GameState();
    this.initializeEventListeners();
    this.showScreen('start-screen');
  }

  initializeEventListeners() {
    // Start screen
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const level = parseInt(e.currentTarget.dataset.level);
        this.startGame(level);
      });
    });

    // Game controls
    document.getElementById('execute-btn').addEventListener('click', () => {
      this.executeProcess();
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      this.pauseGame();
    });

    // Screen transitions
    document.getElementById('next-level-btn').addEventListener('click', () => {
      this.nextLevel();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('try-again-btn').addEventListener('click', () => {
      this.restartCurrentLevel();
    });

    document.getElementById('main-menu-btn').addEventListener('click', () => {
      this.showMainMenu();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.resumeGame();
    });

    document.getElementById('quit-btn').addEventListener('click', () => {
      this.showMainMenu();
    });
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
  }

  startGame(level) {
    this.gameState.reset();
    this.gameState.currentLevel = level;
    this.loadLevel(level);
    this.showScreen('game-screen');
    this.updateDisplay();
  }

  loadLevel(level) {
    let scenario;
    
    if (level === 1) {
      scenario = {
        processes: 2,
        resources: 3,
        max: [[7,5,3], [3,2,2]],
        allocation: [[0,1,0], [2,0,0]],
        available: [5,3,3],
        description: "Basic scenario with 2 processes and 3 resource types"
      };
    } else if (level === 2) {
      scenario = {
        processes: 4,
        resources: 3,
        max: [[7,5,3], [3,2,2], [9,0,2], [2,2,2]],
        allocation: [[0,1,0], [2,0,0], [3,0,2], [2,1,1]],
        available: [5,3,3],
        description: "Intermediate scenario with 4 processes"
      };
    } else {
      // Generate random scenario for level 3+
      scenario = this.generateRandomScenario(level);
    }

    this.gameState.processes = scenario.processes;
    this.gameState.resources = scenario.resources;
    this.gameState.max = scenario.max.map(row => [...row]);
    this.gameState.allocation = scenario.allocation.map(row => [...row]);
    this.gameState.available = [...scenario.available];
    this.gameState.need = BankersAlgorithm.calculateNeed(this.gameState.max, this.gameState.allocation);
    
    // Ensure initial state is safe
    this.ensureSafeInitialState();
    this.checkSafetyState();
  }

  generateRandomScenario(level) {
    const processes = Math.min(2 + level, 6);
    const resources = 3;
    const max = [];
    const allocation = [];
    let available = [10, 8, 6]; // Starting resources

    // Generate max matrix
    for (let i = 0; i < processes; i++) {
      max[i] = [];
      for (let j = 0; j < resources; j++) {
        max[i][j] = Math.floor(Math.random() * 6) + 3;
      }
    }

    // Generate safe allocation matrix with conservative allocations
    for (let i = 0; i < processes; i++) {
      allocation[i] = [];
      for (let j = 0; j < resources; j++) {
        const maxAlloc = Math.min(Math.floor(max[i][j] * 0.4), Math.floor(available[j] * 0.3));
        allocation[i][j] = Math.max(0, maxAlloc);
        available[j] -= allocation[i][j];
      }
    }

    // Ensure positive available resources
    for (let j = 0; j < resources; j++) {
      available[j] = Math.max(available[j], 2);
    }

    return { processes, resources, max, allocation, available };
  }

  ensureSafeInitialState() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const safetyCheck = BankersAlgorithm.isSafeState(
        this.gameState.processes,
        this.gameState.resources,
        this.gameState.max,
        this.gameState.allocation,
        this.gameState.available
      );

      if (safetyCheck.isSafe) {
        break; // Initial state is already safe
      }

      // Reduce allocations to make system safer
      for (let i = 0; i < this.gameState.processes; i++) {
        for (let j = 0; j < this.gameState.resources; j++) {
          if (this.gameState.allocation[i][j] > 0) {
            const reduction = Math.min(1, this.gameState.allocation[i][j]);
            this.gameState.allocation[i][j] -= reduction;
            this.gameState.available[j] += reduction;
          }
        }
      }
      
      this.gameState.need = BankersAlgorithm.calculateNeed(this.gameState.max, this.gameState.allocation);
      attempts++;
    }
  }

  checkSafetyState() {
    const safetyCheck = BankersAlgorithm.isSafeState(
      this.gameState.processes,
      this.gameState.resources,
      this.gameState.max,
      this.gameState.allocation,
      this.gameState.available
    );

    this.gameState.isSafe = safetyCheck.isSafe;
    this.gameState.safeSequence = safetyCheck.safeSequence;
    
    this.updateSafetyDisplay();
    this.updateSafeSequenceDisplay();
  }

  updateSafetyDisplay() {
    const safetyBadge = document.getElementById('safety-badge');
    const safetyIcon = safetyBadge.querySelector('.safety-icon');
    const safetyText = safetyBadge.querySelector('.safety-text');

    safetyBadge.className = 'safety-badge';
    
    if (this.gameState.isSafe) {
      safetyBadge.classList.add('safe');
      safetyIcon.textContent = '✅';
      safetyText.textContent = 'System Safe';
    } else {
      safetyBadge.classList.add('unsafe');
      safetyIcon.textContent = '❌';
      safetyText.textContent = 'System Unsafe';
    }
  }

  updateSafeSequenceDisplay() {
    const sequenceContainer = document.getElementById('safe-sequence');
    const sequenceDisplay = document.getElementById('sequence-display');

    if (this.gameState.isSafe && this.gameState.safeSequence.length > 0) {
      sequenceContainer.classList.remove('hidden');
      sequenceDisplay.innerHTML = this.gameState.safeSequence
        .map(p => `<span class="sequence-item">P${p}</span>`)
        .join('');
    } else {
      sequenceContainer.classList.add('hidden');
    }
  }

  updateDisplay() {
    this.updateGameInfo();
    this.updateMatrices();
    this.updateProcessButtons();
    this.checkSafetyState();
  }

  updateGameInfo() {
    document.getElementById('current-level').textContent = this.gameState.currentLevel;
    document.getElementById('current-score').textContent = this.gameState.score;
    document.getElementById('timer-value').textContent = this.gameState.timeLeft;
  }

  updateMatrices() {
    this.renderMatrix('max-matrix', this.gameState.max);
    this.renderMatrix('allocation-matrix', this.gameState.allocation);
    this.renderMatrix('need-matrix', this.gameState.need);
    this.renderVector('available-vector', this.gameState.available);
  }

  renderMatrix(containerId, matrix) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.style.setProperty('--matrix-cols', this.gameState.resources);

    matrix.forEach((row, i) => {
      row.forEach((cell, j) => {
        const cellElement = document.createElement('div');
        cellElement.className = 'matrix-cell';
        cellElement.textContent = cell;
        cellElement.dataset.row = i;
        cellElement.dataset.col = j;
        container.appendChild(cellElement);
      });
    });
  }

  renderVector(containerId, vector) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.style.setProperty('--vector-cols', vector.length);

    vector.forEach((cell, i) => {
      const cellElement = document.createElement('div');
      cellElement.className = 'vector-cell';
      cellElement.textContent = cell;
      cellElement.dataset.index = i;
      container.appendChild(cellElement);
    });
  }

  updateProcessButtons() {
    const container = document.getElementById('process-buttons');
    container.innerHTML = '';

    for (let i = 0; i < this.gameState.processes; i++) {
      const button = document.createElement('button');
      button.className = 'process-btn';
      button.dataset.processId = i;
      
      let status = 'idle';
      if (this.gameState.completedProcesses.has(i)) {
        status = 'completed';
        button.classList.add('completed');
      } else if (this.gameState.selectedProcess === i) {
        button.classList.add('selected');
      }

      const canExecute = BankersAlgorithm.canExecuteProcess(
        i, this.gameState.need, this.gameState.available
      );

      button.innerHTML = `
        <span>Process P${i}</span>
        <span class="process-status">${status}${canExecute && status === 'idle' ? ' (Ready)' : ''}</span>
      `;

      if (status !== 'completed') {
        button.addEventListener('click', () => this.selectProcess(i));
      }

      container.appendChild(button);
    }
  }

  selectProcess(processId) {
    if (this.gameState.completedProcesses.has(processId)) return;

    this.gameState.selectedProcess = processId;
    this.updateProcessButtons();
    
    const executeBtn = document.getElementById('execute-btn');
    const canExecute = BankersAlgorithm.canExecuteProcess(
      processId, this.gameState.need, this.gameState.available
    );
    
    executeBtn.disabled = !canExecute;
    
    if (!canExecute) {
      this.showMessage('Cannot execute - insufficient resources available', 'warning');
    }
  }

  executeProcess() {
    if (this.gameState.selectedProcess === null) return;

    const processId = this.gameState.selectedProcess;
    
    // Check if process can be executed
    if (!BankersAlgorithm.canExecuteProcess(processId, this.gameState.need, this.gameState.available)) {
      this.showMessage('Cannot execute process - insufficient resources!', 'error');
      return;
    }

    // Start timer on first execution
    if (!this.gameState.timerStarted) {
      this.startTimer();
      this.gameState.timerStarted = true;
    }

    // Execute process (allocate remaining needed resources)
    this.animateProcessExecution(processId);
    
    // Simulate process execution time
    setTimeout(() => {
      this.completeProcessExecution(processId);
    }, 1000);
  }

  animateProcessExecution(processId) {
    // Animate matrix updates
    const allocationCells = document.querySelectorAll(`#allocation-matrix .matrix-cell[data-row="${processId}"]`);
    const needCells = document.querySelectorAll(`#need-matrix .matrix-cell[data-row="${processId}"]`);
    const availableCells = document.querySelectorAll('#available-vector .vector-cell');

    [...allocationCells, ...needCells, ...availableCells].forEach(cell => {
      cell.classList.add('animate', 'updated');
      setTimeout(() => {
        cell.classList.remove('animate', 'updated');
      }, 600);
    });

    // Update process button to show running state
    const processBtn = document.querySelector(`[data-process-id="${processId}"]`);
    if (processBtn) {
      processBtn.classList.add('running');
    }
  }

  completeProcessExecution(processId) {
    // Allocate remaining needed resources
    for (let j = 0; j < this.gameState.resources; j++) {
      this.gameState.allocation[processId][j] = this.gameState.max[processId][j];
      this.gameState.need[processId][j] = 0;
    }

    // Return all allocated resources to available
    for (let j = 0; j < this.gameState.resources; j++) {
      this.gameState.available[j] += this.gameState.allocation[processId][j];
      this.gameState.allocation[processId][j] = 0;
    }

    this.gameState.completedProcesses.add(processId);
    this.gameState.selectedProcess = null;
    this.gameState.executionCount++;
    this.gameState.score += gameData.gameSettings.pointsPerExecution;

    this.updateDisplay();
    this.showMessage(`Process P${processId} completed successfully!`, 'success');

    // Check win condition
    if (this.gameState.completedProcesses.size === this.gameState.processes) {
      this.completeLevel();
    }
  }

  startTimer() {
    this.gameState.timerInterval = setInterval(() => {
      if (!this.gameState.isPaused && !this.gameState.isGameOver) {
        this.gameState.timeLeft--;
        this.updateTimerDisplay();

        if (this.gameState.timeLeft <= 0) {
          this.gameOver();
        }
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const timerValue = document.getElementById('timer-value');
    const timerDisplay = document.getElementById('timer-display');
    
    timerValue.textContent = this.gameState.timeLeft;
    
    timerDisplay.classList.remove('warning', 'danger');
    if (this.gameState.timeLeft <= 10) {
      timerDisplay.classList.add('danger');
    } else if (this.gameState.timeLeft <= 20) {
      timerDisplay.classList.add('warning');
    }
  }

  pauseGame() {
    this.gameState.isPaused = true;
    this.showScreen('pause-screen');
  }

  resumeGame() {
    this.gameState.isPaused = false;
    this.showScreen('game-screen');
  }

  completeLevel() {
    clearInterval(this.gameState.timerInterval);
    
    const executionPoints = this.gameState.executionCount * gameData.gameSettings.pointsPerExecution;
    const timeBonus = this.gameState.timeLeft * gameData.gameSettings.timeBonus;
    const totalScore = this.gameState.score + timeBonus;
    
    this.gameState.score = totalScore;
    
    document.getElementById('execution-points').textContent = executionPoints;
    document.getElementById('time-bonus').textContent = timeBonus;
    document.getElementById('final-score').textContent = totalScore;
    
    this.showScreen('level-complete-screen');
  }

  gameOver() {
    clearInterval(this.gameState.timerInterval);
    this.gameState.isGameOver = true;
    
    document.getElementById('game-over-score').textContent = this.gameState.score;
    this.showScreen('game-over-screen');
  }

  nextLevel() {
    this.gameState.currentLevel++;
    this.gameState.timeLeft = gameData.gameSettings.timerDuration;
    this.gameState.timerStarted = false;
    this.gameState.selectedProcess = null;
    this.gameState.completedProcesses.clear();
    this.gameState.executionCount = 0;
    
    this.loadLevel(this.gameState.currentLevel);
    this.showScreen('game-screen');
    this.updateDisplay();
  }

  restartGame() {
    this.gameState.reset();
    this.showScreen('start-screen');
  }

  restartCurrentLevel() {
    const currentLevel = this.gameState.currentLevel;
    this.gameState.reset();
    this.startGame(currentLevel);
  }

  showMainMenu() {
    clearInterval(this.gameState.timerInterval);
    this.gameState.reset();
    this.showScreen('start-screen');
  }

  showMessage(text, type = 'info') {
    const messageDisplay = document.getElementById('message-display');
    messageDisplay.textContent = text;
    messageDisplay.className = `message-display ${type} show`;
    
    setTimeout(() => {
      messageDisplay.classList.remove('show');
    }, 3000);
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
