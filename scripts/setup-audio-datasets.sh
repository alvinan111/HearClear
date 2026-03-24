#!/bin/bash

# HearClear 音频数据集快速设置脚本
# 自动下载和集成开源音频数据集进行降噪测试
# 用法: bash setup-audio-datasets.sh --quick-start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="${DATA_DIR:-$HOME/audio-data}"
DATASET_CHOICE="${1:-interactive}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎵 HearClear Audio Dataset Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查依赖
check_dependencies() {
    echo -e "\n${YELLOW}📋 Checking dependencies...${NC}"
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Python 3${NC}"
    
    # 检查网络工具
    if command -v wget &> /dev/null; then
        echo -e "${GREEN}✓ wget${NC}"
    elif command -v curl &> /dev/null; then
        echo -e "${GREEN}✓ curl${NC}"
    else
        echo -e "${RED}❌ Neither wget nor curl found${NC}"
        exit 1
    fi
    
    # 检查 unzip
    if ! command -v unzip &> /dev/null; then
        echo -e "${YELLOW}⚠️  unzip not found, will attempt to install${NC}"
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y unzip
        fi
    else
        echo -e "${GREEN}✓ unzip${NC}"
    fi
}

# 创建数据目录
setup_directories() {
    echo -e "\n${YELLOW}📁 Setting up directories...${NC}"
    mkdir -p "$DATA_DIR"/{dns,voicebank,custom}
    mkdir -p "$PROJECT_ROOT/test-data/audio-regression/samples"/{noisy,clean}
    echo -e "${GREEN}✓ Created directories in $DATA_DIR${NC}"
}

# 快速启动方案：仅 VoiceBank（最容易）
quick_start_voicebank() {
    echo -e "\n${BLUE}⚡ Quick Start: VoiceBank+DEMAND (most straightforward)${NC}"
    echo -e "${YELLOW}This will download ~2GB of audio data${NC}"
    
    echo -e "\n${YELLOW}1️⃣  Downloading VoiceBank+DEMAND...${NC}"
    cd "$DATA_DIR/voicebank"
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress \
            https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip
    else
        curl -# -L \
            -o voicebank_demand.zip \
            https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip
    fi
    
    echo -e "${YELLOW}2️⃣  Extracting...${NC}"
    unzip -q voicebank_demand.zip
    
    echo -e "${YELLOW}3️⃣  Preparing dataset for HearClear...${NC}"
    cd "$PROJECT_ROOT"
    python3 scripts/data-preparation/prepare_datasets.py \
        --dataset voicebank \
        --source-dir "$DATA_DIR/voicebank/voicebank_demand" \
        --output-dir . \
        --pairs 114
    
    echo -e "${GREEN}✓ VoiceBank dataset ready!${NC}"
}

# 完整方案：DNS + VoiceBank
full_setup() {
    echo -e "\n${BLUE}📦 Full Setup: DNS + VoiceBank (recommended)${NC}"
    echo -e "${YELLOW}This will download ~5GB of audio data${NC}"
    
    # Step 1: DNS Challenge
    echo -e "\n${YELLOW}1️⃣  DNS Challenge Generic Test Set...${NC}"
    cd "$DATA_DIR/dns"
    
    echo "   Downloading from GitHub (may take a few minutes)..."
    if command -v wget &> /dev/null; then
        wget -q --show-progress \
            -O generic_test_set.tar.gz \
            https://github.com/microsoft/DNS-Challenge/releases/download/generic_test_set/generic_test_set.tar.gz 2>/dev/null || {
            echo -e "${YELLOW}   Note: Direct download failed, try manual: https://github.com/microsoft/DNS-Challenge/releases${NC}"
            echo -e "${YELLOW}   Or use: git clone https://github.com/microsoft/DNS-Challenge.git${NC}"
            echo ""
            read -p "   Continue with VoiceBank only? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                quick_start_voicebank
                return
            else
                exit 1
            fi
        }
    else
        curl -# -L -o generic_test_set.tar.gz \
            https://github.com/microsoft/DNS-Challenge/releases/download/generic_test_set/generic_test_set.tar.gz
    fi
    
    echo -e "${YELLOW}   Extracting DNS...${NC}"
    tar -xzf generic_test_set.tar.gz
    
    echo -e "${YELLOW}2️⃣  VoiceBank+DEMAND...${NC}"
    cd "$DATA_DIR/voicebank"
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress \
            https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip
    else
        curl -# -L -o voicebank_demand.zip \
            https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip
    fi
    
    echo -e "${YELLOW}   Extracting VoiceBank...${NC}"
    unzip -q voicebank_demand.zip
    
    # 准备数据集
    echo -e "\n${YELLOW}3️⃣  Preparing datasets for HearClear...${NC}"
    cd "$PROJECT_ROOT"
    
    # DNS
    echo "   Processing DNS Challenge..."
    python3 scripts/data-preparation/prepare_datasets.py \
        --dataset dns \
        --source-dir "$DATA_DIR/dns/generic_test_set" \
        --output-dir . \
        --pairs 100
    
    # VoiceBank 合并
    echo "   Processing VoiceBank+DEMAND..."
    python3 scripts/data-preparation/prepare_datasets.py \
        --dataset voicebank \
        --source-dir "$DATA_DIR/voicebank/voicebank_demand" \
        --output-dir . \
        --pairs 100 \
        --merge
    
    echo -e "${GREEN}✓ DNS + VoiceBank datasets ready!${NC}"
}

# 自定义方案
custom_setup() {
    echo -e "\n${BLUE}🎛️  Custom Setup${NC}"
    read -p "Enter path to clean audio directory: " clean_dir
    read -p "Enter path to noisy audio directory: " noisy_dir
    
    if [[ ! -d "$clean_dir" ]] || [[ ! -d "$noisy_dir" ]]; then
        echo -e "${RED}❌ One or both directories do not exist${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Preparing custom dataset...${NC}"
    cd "$PROJECT_ROOT"
    python3 scripts/data-preparation/prepare_datasets.py \
        --dataset custom \
        --clean-dir "$clean_dir" \
        --noisy-dir "$noisy_dir" \
        --output-dir .
    
    echo -e "${GREEN}✓ Custom dataset ready!${NC}"
}

# 验证和测试
run_regression_tests() {
    echo -e "\n${YELLOW}🧪 Running regression tests...${NC}"
    
    cd "$PROJECT_ROOT"
    if npm run test:audio-regression > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Tests passed!${NC}"
        
        # 显示结果
        if [[ -f "test-data/audio-regression/reports/report-latest.json" ]]; then
            echo -e "\n${BLUE}📊 Test Results:${NC}"
            # 提取关键指标
            python3 -c "
import json
with open('test-data/audio-regression/reports/report-latest.json', 'r') as f:
    data = json.load(f)
    if 'summary' in data:
        s = data['summary']
        print(f\"  Valid pairs: {s.get('valid_pairs', 'N/A')}\")
        print(f\"  Avg correlation: {s.get('avg_correlation_output', 'N/A'):.3f}\")
        print(f\"  SNR improvement: {s.get('avg_snr_improvement_db', 'N/A'):.1f} dB\")
" 2>/dev/null || true
        fi
    else
        echo -e "${YELLOW}⚠️  Test checks passed but npm test may require more setup${NC}"
    fi
}

# 保存基线
save_baseline() {
    echo -e "\n${YELLOW}💾 Saving baseline report (for future comparisons)...${NC}"
    
    if [[ -f "$PROJECT_ROOT/test-data/audio-regression/reports/report-latest.json" ]]; then
        cp "$PROJECT_ROOT/test-data/audio-regression/reports/report-latest.json" \
           "$PROJECT_ROOT/test-data/audio-regression/reports/baseline.json"
        echo -e "${GREEN}✓ Baseline saved${NC}"
    fi
}

# 显示完成消息
show_completion() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Audio Dataset Setup Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "\n${BLUE}📂 Dataset location:${NC}"
    echo "   $PROJECT_ROOT/test-data/audio-regression/samples/"
    
    echo -e "\n${BLUE}📋 Manifest:${NC}"
    echo "   $PROJECT_ROOT/test-data/audio-regression/manifest.json"
    
    echo -e "\n${BLUE}📊 Next steps:${NC}"
    echo "   1. Run tests: npm run test:audio-regression"
    echo "   2. View results: cat test-data/audio-regression/reports/baseline.json"
    echo "   3. Update docs: Update test-data/audio-regression/README.md with dataset info"
    
    echo -e "\n${BLUE}📚 Documentation:${NC}"
    echo "   - Dataset guide: docs/AUDIO_DATASETS_GUIDE.md"
    echo "   - Test framework: docs/audio-regression-test.md"
    
    echo ""
}

# 交互菜单
show_menu() {
    echo -e "\n${BLUE}Choose setup option:${NC}"
    echo "  1) Quick Start - VoiceBank only (2GB, ~15 min)"
    echo "  2) Full Setup - DNS + VoiceBank (5GB, ~45 min) ⭐ Recommended"
    echo "  3) Custom - Your own audio files"
    echo "  4) Exit"
    echo ""
    read -p "Enter choice (1-4): " choice
}

# Main logic
main() {
    check_dependencies
    setup_directories
    
    # 如果通过命令行参数指定了选项
    case "$DATASET_CHOICE" in
        --quick-start)
            quick_start_voicebank
            ;;
        --full)
            full_setup
            ;;
        interactive)
            show_menu
            case $choice in
                1) quick_start_voicebank ;;
                2) full_setup ;;
                3) custom_setup ;;
                4) echo -e "${YELLOW}Exiting...${NC}"; exit 0 ;;
                *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
            esac
            ;;
        *)
            echo -e "${RED}Unknown option: $DATASET_CHOICE${NC}"
            echo "Usage: bash setup-audio-datasets.sh [--quick-start|--full|interactive]"
            exit 1
            ;;
    esac
    
    # 运行测试和保存基线
    echo ""
    read -p "Run regression tests now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_regression_tests
        save_baseline
    fi
    
    show_completion
}

# 运行主逻辑
main
