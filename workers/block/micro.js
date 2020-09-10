// Copyright (c) 2018-2020, BB Jansen
//
// Please see the included LICENSE file for more information.

"use strict";

const promisify = require("../../libs").promisify;
const db = require("../../libs").knex;
const axios = require("axios");
const UUID = require("uuid/v4");

// Third workflow. n-1 blocks waiting in the `microBlock` queue
// are consumed on a 1:1 bases.

// Now that block n-1 has been finalized, lets fetch its latest metadata
// and update our stored block and store its associated transactions()

module.exports = async function (microBlock, verifyBlock, processAddress) {
  try {
    // 1:1
    // Consume one message at a time for optimum speed,
    // stability and data integrity.

    microBlock.prefetch(1);
    microBlock.consume("microBlock", block);
  } catch (err) {
    console.error("[Tx]: " + err.toString());
  }

  async function block(msg) {
    // Parse message content
    const height = JSON.parse(msg.content.toString());

    // Start db transaction
    const txn = await promisify(db.transaction.bind(db));

    try {
      let block = await axios.get(
        "https://" + process.env.NODE_ADDRESS + "/blocks/at/" + height,
        {
          timeout: +process.env.TIMEOUT,
        }
      );

      block = block.data;

      // Update the block with the latest metadata

      await txn("blocks")
        .update({
          reference: block.reference,
          generator: block.generator,
          signature: block.signature,
          size: block.blocksize,
          count: block.transactionCount,
          fee: block.fee / +process.env.ATOMIC_NUMBER || 0,
          version: block.version || null,
          timestamp: block.timestamp,
        })
        .where("index", height);

      // If enabled, update generator balance.
      // Useful to disable when wanting a quick
      // resync from scratch.

      if (+process.env.UPDATE_ADDRESS) {
        await processAddress.sendToQueue(
          "processAddress",
          Buffer.from(JSON.stringify(block.generator)),
          {
            correlationId: UUID(),
          }
        );
      }

      console.log("[Block] [" + height + "] processed");

      // Check for transactions
      if (block.transactionCount >= 1) {
        // Loop through all the blocks transactions
        for (let tx of block.transactions) {
          // Start db transaction
          const txn = await promisify(db.transaction.bind(db));

          try {
            // Store Tx
            await txn("transactions").insert({
              id: tx.id,
              type: tx.type,
              block: block.height,
              recipient: tx.recipient,
              sender: tx.sender,
              senderPublicKey: tx.senderPublicKey,
              amount:
                tx.amount / +process.env.ATOMIC_NUMBER ||
                tx.totalAmount / +process.env.ATOMIC_NUMBER ||
                null,
              fee: tx.fee / +process.env.ATOMIC_NUMBER,
              signature: tx.signature,
              attachment: tx.attachment,
              timestamp: tx.timestamp,
              version: tx.version,
              leaseId: tx.leaseId,
              verified: +process.env.VERIFY_CACHE === 0 ? true : false,
            });

            // Store Tx Proofs
            if (tx.proofs) {
              await txn("proofs").insert({
                tid: tx.id,
                proofs: JSON.stringify(tx.proofs),
              });
            }

            // Store Tx Anchors
            if (tx.anchors) {
              await txn("anchors").insert({
                tid: tx.id,
                anchors: JSON.stringify(tx.anchors),
              });
            }

            // Store Tx Transfers
            if (tx.transfers) {
              for (let transfer of tx.transfers) {
                await txn("transfers").insert({
                  tid: tx.id,
                  recipient: transfer.recipient,
                  amount: transfer.amount / +process.env.ATOMIC_NUMBER || null,
                });

                // If enabled, update recipient balance.
                // Useful to disable when wanting a quick
                // resync from scratch.

                if (+process.env.UPDATE_ADDRESS) {
                  await processAddress.sendToQueue(
                    "processAddress",
                    Buffer.from(JSON.stringify(transfer.recipient)),
                    {
                      correlationId: UUID(),
                    }
                  );
                }
              }
            }

            // If enabled, update unique recipient balance.
            // Useful to disable when wanting a quick
            // resync from scratch.

            if (+process.env.UPDATE_ADDRESS) {
              // Create an array with unique addresses from each transaction
              let uniqueprocessAddress = new Set();

              for (let tx of block.transactions) {
                uniqueprocessAddress.add(tx.recipient);
              }
              for (let tx of block.transactions) {
                uniqueprocessAddress.add(tx.sender);
              }

              uniqueprocessAddress = [...uniqueprocessAddress];
              uniqueprocessAddress.filter(Boolean);

              // Update balances of each address
              for (let address of uniqueprocessAddress) {
                if (address) {
                  await processAddress.sendToQueue(
                    "processAddress",
                    Buffer.from(JSON.stringify(address)),
                    {
                      correlationId: UUID(),
                    }
                  );
                }
              }
            }

            // Commit db transaction
            await txn.commit();

            console.log("[Tx] [" + tx.id + "] processed");
          } catch (err) {
            // SQL errror 1062 = duplicate entry
            if (err.errno === 1062) {
              // Commit db transaction
              await txn.commit();

              console.warn("[Tx] [" + tx.id + "] duplicate");
            } else {
              // Rollback db transaction
              await txn.rollback();

              console.error("[Block] [" + block.height + "] " + err.toString());
            }
          }
        }
      }

      // Disable for quicker sync from zero.
      //
      // Always have VERIFY_CACHE set to true when fully synced!

      if (+process.env.VERIFY_CACHE) {
        await verifyBlock.publish(
          "delayed",
          "block",
          Buffer.from(JSON.stringify(block)),
          {
            correlationId: UUID(),
            headers: { "x-delay": +process.env.VERIFY_INTERVAL },
          }
        );
      }

      // Commit db transaction
      txn.commit();

      // Acknowledge message
      await microBlock.ack(msg);
    } catch (err) {
      // Rollback db transaction
      await txn.rollback();

      // Send message back to the queue for a retry
      await microBlock.nack(msg);

      console.error("[Block] [" + height + "] " + err.toString());
    }
  }
};
