---
inclusion: always
---

# Product Context

## Summary
<!-- 3-line max -->
- **Product**: ACR Management System — ระบบบริหารจัดการคำขอเปลี่ยนแปลง/แก้ไขสิทธิและระบบสารสนเทศ (Change Request) แบบครบวงจร
- **Users**: Requester, Approver Request, Call Center, IT Reviewer, Approver, Implementer, Auditor, Admin
- **Type**: Greenfield — new internal web application

## Overview

ACR Management System (Access Right Registration / Change Request / Revoke Request Management System) เป็นระบบเว็บภายในองค์กรของ Dynamic IT Solution (DITS) ที่ใช้บริหารจัดการกระบวนการเปลี่ยนแปลง/แก้ไขระบบสารสนเทศแบบครบวงจร ครอบคลุมการเปลี่ยนแปลงหลายประเภท (Application, Hardware, Network, Server, Firewall, OS, VPN, Internet/Wi-Fi, Active Directory และอื่น ๆ) ตั้งแต่การสร้างคำขอ การวิเคราะห์ผลกระทบ การวางแผน การทดสอบ การอนุมัติ การนำขึ้น Production การ Rollout/Rollback ไปจนถึงการปิดงาน รองรับทั้ง Normal Change และ Emergency Change

## Problem Statement

ปัจจุบันกระบวนการ Change Request ใช้เอกสาร (Word/Excel) และฟอร์ม ISO27001 (ISMS-FM-016, -027, -029) ทำให้ติดตามสถานะยาก ขาด audit trail ที่ตรวจสอบย้อนหลังได้ และไม่มีการบังคับ workflow/approval อย่างเป็นระบบ ระบบนี้แทนที่กระบวนการเอกสารด้วยระบบกลางที่มี workflow, approval control, audit log และ reporting

## Target Users

- **Requester**: ผู้ร้องขอ Change — สร้างและส่งคำขอเปลี่ยนแปลง
- **Approver Request**: หัวหน้าฝ่าย/ผู้อนุมัติของผู้ร้องขอ — อนุมัติคำขอเบื้องต้น (ผ่าน email link ไม่ต้อง login)
- **Call Center**: เปิด Ticket และ assign case ให้ IT ผู้รับผิดชอบ
- **IT Reviewer**: วิเคราะห์ Impact, Risk และจัดทำ Implementation/Rollout/Rollback Plan
- **Approver**: หัวหน้าฝ่าย/ผู้มีอำนาจอนุมัติ Change ในส่วน IT
- **Implementer**: ผู้ดำเนินการ Change/deploy บนระบบจริง
- **Auditor**: ตรวจสอบประวัติ เอกสาร และ Audit Log
- **Admin**: ดูแลระบบ กำหนดสิทธิ์ ผู้ใช้งาน Master Data และ Workflow

## Key Features

- **Change Request Authoring**: สร้าง/แก้ไข/ส่งคำขอ เลือก Change Type, Impact Level, Affected Service
- **IT Review & Planning**: Impact Analysis, Risk Assessment, Implementation/Rollout/Rollback Plan
- **Testing**: บันทึกผลทดสอบ และ action เมื่อทดสอบไม่ผ่าน
- **Approval Workflow**: อนุมัติ/ไม่อนุมัติพร้อมเหตุผล รองรับ Normal และ Emergency (post-approval)
- **Implementation & Verification**: assign implementer, บันทึก deployment, version, downtime, post-implementation review
- **Attachments / Evidence**: แนบหลักฐาน (รูปภาพ, เอกสาร, log)
- **Notifications**: แจ้งเตือนผ่าน email ตามสถานะ
- **Audit & Reporting**: change history, audit log (immutable), search, export Excel/PDF
- **Admin / Master Data**: จัดการ Service, Impact Level, Change Type, Role, User

## Domain Language

| Term | Definition | Example |
|------|-----------|---------|
| Change Request (CR) | คำขอเปลี่ยนแปลง/แก้ไขระบบหนึ่งรายการ = 1 workflow | CR-2026-0001 |
| Normal Change | การเปลี่ยนแปลงปกติ ต้องอนุมัติก่อนขึ้น Production | — |
| Emergency Change | การเปลี่ยนแปลงเร่งด่วน ทำก่อนได้แต่ต้องขออนุมัติย้อนหลัง | — |
| Impact Level | ระดับผลกระทบ: Major, High, Medium, Low, Very Low | High |
| Implementation Plan | ขั้นตอนการดำเนินการเปลี่ยนแปลง | — |
| Rollout Plan | แผนนำการเปลี่ยนแปลงขึ้น Production | — |
| Rollback Plan | แผนย้อนกลับเมื่อการเปลี่ยนแปลงล้มเหลว | — |
| Audit Log | บันทึกทุกการกระทำแบบแก้ไข/ลบไม่ได้ (immutable) | User, Action, Timestamp, Old/New Value |
| Workflow Status | สถานะใน flow: Draft → Submitted → IT Review → Approval → Implementation → Verification → Closed | — |

## Success Criteria

- แทนที่กระบวนการเอกสาร (Word/Excel) ด้วยระบบกลางได้ครบทุกขั้นตอน
- ทุกการกระทำมี audit trail ที่ตรวจสอบย้อนหลังได้ 100%
- Workflow บังคับลำดับขั้นและ approval control อัตโนมัติ
- (เพิ่มเติมระหว่าง requirements phase)

## Constraints & Assumptions

**Constraints**:
- Technical: Frontend = React + Tailwind + MUI; Backend = Node.js; Database = Microsoft SQL Server Express; IaC = Terraform; Local dev = Docker Compose
- Infrastructure: AWS — ECS (containers), S3 + CloudFront (static web), RDS MSSQL Express
- Regulatory: อ้างอิงแบบฟอร์ม ISO27001 (ISMS-FM-016, -027, -029); audit log ต้อง immutable
- Auth: รองรับ Microsoft (MS365/AD); การเข้าใช้งานมี 2 รูปแบบ — ไม่ต้อง login และ login ด้วย email บริษัท
- Approval control: ผู้อนุมัติและผู้ดำเนินการต้องไม่ใช่คนเดียวกัน

**Assumptions**:
- ผู้ใช้งานใช้ browser ปัจจุบัน (Chrome, Edge)
- มี email กลางของ IT (Service@dits.co.th) สำหรับรับคำขอ
- หัวหน้างานอนุมัติผ่าน email link โดยไม่ต้อง login แต่ระบบเก็บ log ชื่อ/ตำแหน่งผู้อนุมัติ

## Project Type

- **Type**: Greenfield
- **Scope**: New product
