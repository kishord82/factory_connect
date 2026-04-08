/**
 * Tests for PayrollExtractor: employees and salary registers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayrollExtractor } from './payroll-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('PayrollExtractor', () => {
  let extractor: PayrollExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'Payroll Test Co',
      timeout: 5000,
    };
    extractor = new PayrollExtractor(config);
  });

  describe('extract', () => {
    it('should extract employees and salary registers', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <EMPLOYEES>
                <EMPLOYEELINE>
                  <NAME>John Doe</NAME>
                  <EMPLOYEEID>EMP001</EMPLOYEEID>
                  <DESIGNATION>Software Engineer</DESIGNATION>
                  <DEPARTMENT>IT</DEPARTMENT>
                  <PAN>AAAAA1234A</PAN>
                  <UAN>100012345678</UAN>
                  <ESI>1234567890</ESI>
                  <BANKACCOUNT>1111111111</BANKACCOUNT>
                  <DATEOFJOINING>01-01-2020</DATEOFJOINING>
                </EMPLOYEELINE>
              </EMPLOYEES>
              <SALARYREGISTER>
                <SALARYLINE>
                  <MONTH>January 2024</MONTH>
                  <EMPLOYEENAME>John Doe</EMPLOYEENAME>
                  <BASIC>50000</BASIC>
                  <HRA>10000</HRA>
                  <DA>5000</DA>
                  <OTHERALLOWANCES>2000</OTHERALLOWANCES>
                  <GROSSSALARY>67000</GROSSSALARY>
                  <PFEMPLOYEE>3600</PFEMPLOYEE>
                  <PFEMPLOYER>3600</PFEMPLOYER>
                  <ESIEMPLOYEE>100</ESIEMPLOYEE>
                  <ESIEMPLOYER>100</ESIEMPLOYER>
                  <PROFESSIONALTAX>200</PROFESSIONALTAX>
                  <TDS>1000</TDS>
                  <TOTALDEDUCTIONS>4900</TOTALDEDUCTIONS>
                  <NETSALARY>62100</NETSALARY>
                </SALARYLINE>
              </SALARYREGISTER>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.success).toBe(true);
      expect(result.data.employees).toHaveLength(1);
      expect(result.data.salaryRegister).toHaveLength(1);
      expect(result.recordCount).toBe(2);
    });

    it('should parse employee details correctly', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <EMPLOYEES>
                <EMPLOYEELINE>
                  <NAME>Jane Smith</NAME>
                  <EMPLOYEEID>EMP002</EMPLOYEEID>
                  <DESIGNATION>HR Manager</DESIGNATION>
                  <DEPARTMENT>HR</DEPARTMENT>
                  <PAN>BBBBB5678B</PAN>
                  <UAN>100023456789</UAN>
                  <ESI>9876543210</ESI>
                  <BANKACCOUNT>2222222222</BANKACCOUNT>
                  <DATEOFJOINING>15-06-2021</DATEOFJOINING>
                </EMPLOYEELINE>
              </EMPLOYEES>
              <SALARYREGISTER/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const employee = result.data.employees[0];

      expect(employee.name).toBe('Jane Smith');
      expect(employee.employeeId).toBe('EMP002');
      expect(employee.designation).toBe('HR Manager');
      expect(employee.department).toBe('HR');
      expect(employee.panNumber).toBe('BBBBB5678B');
      expect(employee.uanNumber).toBe('100023456789');
      expect(employee.dateOfJoining).toBe('15-06-2021');
    });

    it('should parse salary line with all components', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <EMPLOYEES/>
              <SALARYREGISTER>
                <SALARYLINE>
                  <MONTH>March 2024</MONTH>
                  <EMPLOYEENAME>Test Employee</EMPLOYEENAME>
                  <BASIC>60000</BASIC>
                  <HRA>15000</HRA>
                  <DA>8000</DA>
                  <OTHERALLOWANCES>3000</OTHERALLOWANCES>
                  <GROSSSALARY>86000</GROSSSALARY>
                  <PFEMPLOYEE>5180</PFEMPLOYEE>
                  <PFEMPLOYER>5180</PFEMPLOYER>
                  <ESIEMPLOYEE>150</ESIEMPLOYEE>
                  <ESIEMPLOYER>150</ESIEMPLOYER>
                  <PROFESSIONALTAX>250</PROFESSIONALTAX>
                  <TDS>1500</TDS>
                  <TOTALDEDUCTIONS>6880</TOTALDEDUCTIONS>
                  <NETSALARY>79120</NETSALARY>
                </SALARYLINE>
              </SALARYREGISTER>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const salary = result.data.salaryRegister[0];

      expect(salary.month).toBe('March 2024');
      expect(salary.employeeName).toBe('Test Employee');
      expect(salary.basic).toBe(60000);
      expect(salary.grossSalary).toBe(86000);
      expect(salary.pfEmployee).toBe(5180);
      expect(salary.esiEmployee).toBe(150);
      expect(salary.totalDeductions).toBe(6880);
      expect(salary.netSalary).toBe(79120);
    });

    it('should handle multiple employees and salary entries', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <EMPLOYEES>
                <EMPLOYEELINE>
                  <NAME>Employee 1</NAME>
                  <EMPLOYEEID>EMP001</EMPLOYEEID>
                  <DESIGNATION>Role 1</DESIGNATION>
                  <DEPARTMENT>Dept 1</DEPARTMENT>
                  <PAN>PAN001</PAN>
                  <UAN>UAN001</UAN>
                  <ESI>ESI001</ESI>
                  <BANKACCOUNT>ACC001</BANKACCOUNT>
                  <DATEOFJOINING>01-01-2020</DATEOFJOINING>
                </EMPLOYEELINE>
                <EMPLOYEELINE>
                  <NAME>Employee 2</NAME>
                  <EMPLOYEEID>EMP002</EMPLOYEEID>
                  <DESIGNATION>Role 2</DESIGNATION>
                  <DEPARTMENT>Dept 2</DEPARTMENT>
                  <PAN>PAN002</PAN>
                  <UAN>UAN002</UAN>
                  <ESI>ESI002</ESI>
                  <BANKACCOUNT>ACC002</BANKACCOUNT>
                  <DATEOFJOINING>01-02-2021</DATEOFJOINING>
                </EMPLOYEELINE>
              </EMPLOYEES>
              <SALARYREGISTER>
                <SALARYLINE>
                  <MONTH>Jan 2024</MONTH>
                  <EMPLOYEENAME>Employee 1</EMPLOYEENAME>
                  <BASIC>50000</BASIC>
                  <HRA>10000</HRA>
                  <DA>5000</DA>
                  <OTHERALLOWANCES>2000</OTHERALLOWANCES>
                  <GROSSSALARY>67000</GROSSSALARY>
                  <PFEMPLOYEE>3600</PFEMPLOYEE>
                  <PFEMPLOYER>3600</PFEMPLOYER>
                  <ESIEMPLOYEE>100</ESIEMPLOYEE>
                  <ESIEMPLOYER>100</ESIEMPLOYER>
                  <PROFESSIONALTAX>200</PROFESSIONALTAX>
                  <TDS>1000</TDS>
                  <TOTALDEDUCTIONS>4900</TOTALDEDUCTIONS>
                  <NETSALARY>62100</NETSALARY>
                </SALARYLINE>
                <SALARYLINE>
                  <MONTH>Jan 2024</MONTH>
                  <EMPLOYEENAME>Employee 2</EMPLOYEENAME>
                  <BASIC>45000</BASIC>
                  <HRA>9000</HRA>
                  <DA>4500</DA>
                  <OTHERALLOWANCES>1500</OTHERALLOWANCES>
                  <GROSSSALARY>60000</GROSSSALARY>
                  <PFEMPLOYEE>3200</PFEMPLOYEE>
                  <PFEMPLOYER>3200</PFEMPLOYER>
                  <ESIEMPLOYEE>100</ESIEMPLOYEE>
                  <ESIEMPLOYER>100</ESIEMPLOYER>
                  <PROFESSIONALTAX>200</PROFESSIONALTAX>
                  <TDS>900</TDS>
                  <TOTALDEDUCTIONS>4600</TOTALDEDUCTIONS>
                  <NETSALARY>55400</NETSALARY>
                </SALARYLINE>
              </SALARYREGISTER>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.employees).toHaveLength(2);
      expect(result.data.salaryRegister).toHaveLength(2);
      expect(result.data.employees[0].name).toBe('Employee 1');
      expect(result.data.employees[1].department).toBe('Dept 2');
      expect(result.data.salaryRegister[1].netSalary).toBe(55400);
    });

    it('should handle empty sections', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <EMPLOYEES/>
              <SALARYREGISTER/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.success).toBe(true);
      expect(result.data.employees).toHaveLength(0);
      expect(result.data.salaryRegister).toHaveLength(0);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      expect(extractor.getExtractionType()).toBe('PAYROLL_DATA');
    });
  });

  describe('error handling', () => {
    it('should throw on Tally connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on XML parse error', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<invalid>xml</broken>',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
