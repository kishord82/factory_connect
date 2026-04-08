/**
 * Payroll Extractor: Pulls employee details and salary registers from TallyPrime.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface Employee {
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  panNumber: string;
  uanNumber: string;
  esiNumber: string;
  bankAccount: string;
  dateOfJoining: string;
}

export interface SalaryRegisterLine {
  month: string;
  employeeName: string;
  basic: number;
  hra: number;
  da: number;
  otherAllowances: number;
  grossSalary: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  totalDeductions: number;
  netSalary: number;
}

export interface PayrollExtractionData {
  employees: Employee[];
  salaryRegister: SalaryRegisterLine[];
}

export class PayrollExtractor extends BaseExtractor<PayrollExtractionData> {
  constructor(config: TallyConfig) {
    super(config);
  }

  async extract(): Promise<ExtractionResult<PayrollExtractionData>> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordCount = 0;

    try {
      // Extract employees and salary data in parallel
      const [employees, salaryRegister] = await Promise.all([
        this.extractEmployees().catch((err) => {
          errors.push(`Employees: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractSalaryRegister().catch((err) => {
          errors.push(`Salary Register: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
      ]);

      recordCount = employees.length + salaryRegister.length;

      return {
        success: errors.length === 0,
        data: {
          employees,
          salaryRegister,
        },
        extractedAt: new Date(),
        recordCount,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_PAYROLL_EXTRACTION_FAILED',
        `Payroll extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { duration: Date.now() - startTime },
      );
    }
  }

  private async extractEmployees(): Promise<Employee[]> {
    const tdlRequest = this.buildEmployeesTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const employees: Employee[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.EMPLOYEES) {
      const employeeData = data.EMPLOYEES as Record<string, unknown>;
      const lines = employeeData.EMPLOYEELINE;

      if (Array.isArray(lines)) {
        employees.push(...lines.map((line) => this.parseEmployeeLine(line as Record<string, unknown>)));
      } else if (lines) {
        employees.push(this.parseEmployeeLine(lines as Record<string, unknown>));
      }
    }

    return employees;
  }

  private async extractSalaryRegister(): Promise<SalaryRegisterLine[]> {
    const tdlRequest = this.buildSalaryRegisterTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const salaryLines: SalaryRegisterLine[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.SALARYREGISTER) {
      const salaryData = data.SALARYREGISTER as Record<string, unknown>;
      const lines = salaryData.SALARYLINE;

      if (Array.isArray(lines)) {
        salaryLines.push(...lines.map((line) => this.parseSalaryLine(line as Record<string, unknown>)));
      } else if (lines) {
        salaryLines.push(this.parseSalaryLine(lines as Record<string, unknown>));
      }
    }

    return salaryLines;
  }

  private parseEmployeeLine(line: Record<string, unknown>): Employee {
    return {
      name: String(line.NAME || ''),
      employeeId: String(line.EMPLOYEEID || ''),
      designation: String(line.DESIGNATION || ''),
      department: String(line.DEPARTMENT || ''),
      panNumber: String(line.PAN || ''),
      uanNumber: String(line.UAN || ''),
      esiNumber: String(line.ESI || ''),
      bankAccount: String(line.BANKACCOUNT || ''),
      dateOfJoining: String(line.DATEOFJOINING || ''),
    };
  }

  private parseSalaryLine(line: Record<string, unknown>): SalaryRegisterLine {
    return {
      month: String(line.MONTH || ''),
      employeeName: String(line.EMPLOYEENAME || ''),
      basic: Number(line.BASIC || 0),
      hra: Number(line.HRA || 0),
      da: Number(line.DA || 0),
      otherAllowances: Number(line.OTHERALLOWANCES || 0),
      grossSalary: Number(line.GROSSSALARY || 0),
      pfEmployee: Number(line.PFEMPLOYEE || 0),
      pfEmployer: Number(line.PFEMPLOYER || 0),
      esiEmployee: Number(line.ESIEMPLOYEE || 0),
      esiEmployer: Number(line.ESIEMPLOYER || 0),
      professionalTax: Number(line.PROFESSIONALTAX || 0),
      tds: Number(line.TDS || 0),
      totalDeductions: Number(line.TOTALDEDUCTIONS || 0),
      netSalary: Number(line.NETSALARY || 0),
    };
  }

  private buildEmployeesTdl(): string {
    return this.buildTdlRequest('Employees Master', {
      SHOWALL: 'Yes',
    });
  }

  private buildSalaryRegisterTdl(): string {
    return this.buildTdlRequest('Salary Register', {
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWHEADWISE: 'Yes',
    });
  }

  getExtractionType(): string {
    return 'PAYROLL_DATA';
  }
}
