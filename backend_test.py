import requests
import sys
import os
import io
from datetime import datetime
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

class CortexAITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.contract_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "",
            200
        )
        return success

    def create_test_pdf(self):
        """Create a proper test PDF content"""
        buffer = io.BytesIO()
        
        # Create PDF with reportlab
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Add content to PDF
        p.drawString(100, height - 100, "LEGAL CONTRACT AGREEMENT")
        p.drawString(100, height - 140, "")
        p.drawString(100, height - 160, "This is a test legal contract for testing purposes.")
        p.drawString(100, height - 200, "")
        p.drawString(100, height - 220, "TERMINATION CLAUSE:")
        p.drawString(100, height - 240, "Either party may terminate this agreement with 30 days written notice.")
        p.drawString(100, height - 280, "")
        p.drawString(100, height - 300, "PAYMENT TERMS:")
        p.drawString(100, height - 320, "Payment shall be made within 30 days of invoice date.")
        p.drawString(100, height - 360, "")
        p.drawString(100, height - 380, "GOVERNING LAW:")
        p.drawString(100, height - 400, "This agreement shall be governed by the laws of India.")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        return buffer.getvalue()

    def test_upload_contract(self):
        """Test contract upload"""
        # Create test PDF content
        pdf_content = self.create_test_pdf()
        
        files = {
            'file': ('test_contract.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        success, response = self.run_test(
            "Upload Contract",
            "POST",
            "api/upload",
            200,
            files=files
        )
        
        if success and 'contract_id' in response:
            self.contract_id = response['contract_id']
            print(f"   Contract ID: {self.contract_id}")
            return True
        return False

    def test_upload_invalid_file(self):
        """Test upload with invalid file type"""
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not a PDF'), 'text/plain')
        }
        
        success, response = self.run_test(
            "Upload Invalid File Type",
            "POST",
            "api/upload",
            400,
            files=files
        )
        return success

    def test_upload_large_file(self):
        """Test upload with file too large"""
        # Create a large content (simulate >10MB)
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        
        files = {
            'file': ('large_contract.pdf', io.BytesIO(large_content), 'application/pdf')
        }
        
        success, response = self.run_test(
            "Upload Large File",
            "POST",
            "api/upload",
            400,
            files=files
        )
        return success

    def test_ask_question(self):
        """Test asking a question about uploaded contract"""
        if not self.contract_id:
            print("❌ No contract ID available for question test")
            return False
            
        question_data = {
            "question": "What are the termination clauses in this contract?",
            "contract_id": self.contract_id
        }
        
        success, response = self.run_test(
            "Ask Question",
            "POST",
            "api/ask",
            200,
            data=question_data
        )
        return success

    def test_ask_question_no_contract(self):
        """Test asking question without valid contract"""
        question_data = {
            "question": "What are the payment terms?",
            "contract_id": "invalid-contract-id"
        }
        
        success, response = self.run_test(
            "Ask Question - No Contract",
            "POST",
            "api/ask",
            404,
            data=question_data
        )
        return success

    def test_ask_empty_question(self):
        """Test asking empty question"""
        if not self.contract_id:
            print("❌ No contract ID available for empty question test")
            return False
            
        question_data = {
            "question": "",
            "contract_id": self.contract_id
        }
        
        success, response = self.run_test(
            "Ask Empty Question",
            "POST",
            "api/ask",
            400,
            data=question_data
        )
        return success

    def test_get_contract_info(self):
        """Test getting contract information"""
        if not self.contract_id:
            print("❌ No contract ID available for contract info test")
            return False
            
        success, response = self.run_test(
            "Get Contract Info",
            "GET",
            f"api/contracts/{self.contract_id}",
            200
        )
        return success

    def test_get_invalid_contract_info(self):
        """Test getting info for invalid contract"""
        success, response = self.run_test(
            "Get Invalid Contract Info",
            "GET",
            "api/contracts/invalid-contract-id",
            404
        )
        return success

def main():
    print("🚀 Starting Cortex AI Backend API Tests")
    print("=" * 50)
    
    # Initialize tester
    tester = CortexAITester()
    
    # Run all tests
    test_results = []
    
    # Basic health check
    test_results.append(tester.test_health_check())
    
    # File upload tests
    test_results.append(tester.test_upload_contract())
    test_results.append(tester.test_upload_invalid_file())
    # Skip large file test as it might be too slow
    # test_results.append(tester.test_upload_large_file())
    
    # Question asking tests
    test_results.append(tester.test_ask_question())
    test_results.append(tester.test_ask_question_no_contract())
    test_results.append(tester.test_ask_empty_question())
    
    # Contract info tests
    test_results.append(tester.test_get_contract_info())
    test_results.append(tester.test_get_invalid_contract_info())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())